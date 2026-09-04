package com.ridex.points;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.points.domain.PointEntry;
import com.ridex.points.domain.PointReason;
import com.ridex.points.domain.Referral;
import com.ridex.points.domain.ReferralStatus;
import com.ridex.points.dto.PointEntryResponse;
import com.ridex.points.dto.PointsBalanceResponse;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Loyalty points, and the referrals that award them.
 *
 * <p>Points are not money. They have no currency, cannot be withdrawn, and touch money in exactly
 * one place: a discount line on a fare, priced by a rate this service owns.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PointsService {

    // No I, O, 0 or 1: a referral code gets read aloud and typed from a screenshot.
    private static final char[] CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int CODE_LENGTH = 7;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PointEntryRepository pointEntryRepository;
    private final ReferralRepository referralRepository;
    private final UserRepository userRepository;

    @Value("${app.points.referral-reward:250}")
    private int referralReward;

    @Value("${app.points.referral-welcome:100}")
    private int referralWelcome;

    @Value("${app.points.per-ride:20}")
    private int pointsPerRide;

    /** How many points buy one unit of currency. 100 points per rupee at the default rate. */
    @Value("${app.points.per-currency-unit:100}")
    private int pointsPerCurrencyUnit;

    @Value("${app.points.currency:INR}")
    private String currency;

    @Transactional
    public PointsBalanceResponse balance(String userId) {
        User user = requireUser(userId);
        String code = ensureReferralCode(user);

        int balance = pointEntryRepository.balanceOf(userId);

        return new PointsBalanceResponse(
                balance,
                code,
                (int) referralRepository.countByReferrerUserIdAndStatus(userId, ReferralStatus.PENDING),
                (int) referralRepository.countByReferrerUserIdAndStatus(userId, ReferralStatus.REWARDED),
                currency,
                // What the rate would take off a fare today. Not a withdrawable balance.
                (long) (balance / pointsPerCurrencyUnit) * 100,
                pointsPerCurrencyUnit,
                pointEntryRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                        .map(entry -> new PointEntryResponse(entry.getId(), entry.getPoints(),
                                entry.getReason(), entry.getNote(), entry.getCreatedAt()))
                        .toList());
    }

    /**
     * Records who referred whom. Nothing is awarded here.
     *
     * <p>Paying at signup pays for accounts, not for riders, and is farmed within a week of launch.
     * The reward lands when the referee finishes a ride.
     */
    @Transactional
    public void applyReferralCode(String refereeUserId, String rawCode) {
        String code = rawCode.trim().toUpperCase();

        User referrer = userRepository.findByReferralCode(code)
                .orElseThrow(() -> new NotFoundException("That referral code is not valid."));

        if (referrer.getId().equals(refereeUserId)) {
            throw new ConflictException("You cannot refer yourself.");
        }
        if (referralRepository.findByRefereeUserId(refereeUserId).isPresent()) {
            // One account is referred once, ever. The unique constraint enforces it too.
            throw new ConflictException("This account has already used a referral code.");
        }

        Referral referral = new Referral();
        referral.setReferrerUserId(referrer.getId());
        referral.setRefereeUserId(refereeUserId);
        referral.setCode(code);
        referralRepository.save(referral);
    }

    /**
     * Awards points for a finished ride, and settles a pending referral if this was the first one.
     *
     * <p>Every award carries an idempotency key, so a retried completion cannot pay twice.
     */
    @Transactional
    public void awardForCompletedRide(String riderUserId, String rideId) {
        award(riderUserId, pointsPerRide, PointReason.RIDE_COMPLETED, "RIDE", rideId,
                "ride:" + rideId, "Points for a completed ride");

        referralRepository.findByRefereeUserId(riderUserId)
                .filter(referral -> referral.getStatus() == ReferralStatus.PENDING)
                .ifPresent(referral -> settle(referral, rideId));
    }

    private void settle(Referral referral, String rideId) {
        award(referral.getReferrerUserId(), referralReward, PointReason.REFERRAL_REWARD,
                "REFERRAL", referral.getId(), "referral-reward:" + referral.getId(),
                "A friend you referred took their first ride");

        award(referral.getRefereeUserId(), referralWelcome, PointReason.REFERRAL_WELCOME,
                "REFERRAL", referral.getId(), "referral-welcome:" + referral.getId(),
                "Welcome bonus for joining with a referral code");

        referral.setStatus(ReferralStatus.REWARDED);
        referral.setQualifiedAt(Instant.now());
        referralRepository.save(referral);
        log.info("Referral {} rewarded after ride {}", referral.getId(), rideId);
    }

    /** Spends points against a ride. Returns what was actually taken, which may be less than asked. */
    @Transactional
    public int redeem(String userId, int requestedPoints, String rideId) {
        if (requestedPoints <= 0) {
            return 0;
        }

        int balance = pointEntryRepository.balanceOf(userId);
        // Only whole currency units are worth redeeming, and never more than the rider has.
        int spendable = Math.min(requestedPoints, balance);
        int usable = (spendable / pointsPerCurrencyUnit) * pointsPerCurrencyUnit;
        if (usable <= 0) {
            return 0;
        }

        award(userId, -usable, PointReason.REDEEMED_ON_RIDE, "RIDE", rideId,
                "redeem:" + rideId, "Redeemed against a ride");
        return usable;
    }

    /** Minor units a number of points is worth at the current rate. */
    public long valueOf(int points) {
        return (long) (points / pointsPerCurrencyUnit) * 100;
    }

    private void award(String userId, int points, PointReason reason, String referenceType,
            String referenceId, String idempotencyKey, String note) {
        // Checked as well as constrained: a duplicate award is expected traffic on a retry, and a
        // constraint violation would abort the whole completion for something that is not an error.
        if (pointEntryRepository.existsByIdempotencyKey(idempotencyKey)) {
            return;
        }

        PointEntry entry = new PointEntry();
        entry.setUserId(userId);
        entry.setPoints(points);
        entry.setReason(reason);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setIdempotencyKey(idempotencyKey);
        entry.setNote(note);
        pointEntryRepository.save(entry);
    }

    /** Codes are minted on first use rather than at signup, so dormant accounts do not hold one. */
    private String ensureReferralCode(User user) {
        if (user.getReferralCode() != null) {
            return user.getReferralCode();
        }

        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = randomCode();
            if (userRepository.findByReferralCode(candidate).isEmpty()) {
                user.setReferralCode(candidate);
                userRepository.save(user);
                return candidate;
            }
        }
        throw new ConflictException("Could not allocate a referral code. Please try again.");
    }

    private static String randomCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET[RANDOM.nextInt(CODE_ALPHABET.length)]);
        }
        return code.toString();
    }

    private User requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("No such account."));
    }

    public List<PointReason> reasons() {
        return List.of(PointReason.values());
    }
}
