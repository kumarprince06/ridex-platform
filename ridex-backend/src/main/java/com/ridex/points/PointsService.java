package com.ridex.points;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.points.domain.PointEntry;
import com.ridex.points.domain.PointReason;
import com.ridex.points.domain.Referral;
import com.ridex.points.domain.ReferralRewardType;
import com.ridex.points.domain.ReferralStatus;
import com.ridex.points.dto.PointEntryResponse;
import com.ridex.points.dto.PointsBalanceResponse;
import com.ridex.shared.exception.ConflictException;
import com.ridex.platform.settings.SettingsService;
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
    private final SettingsService settings;

    @Value("${app.points.currency:INR}")
    private String currency;

    // Read through settings so operations can change them without a deploy. The numbers here are
    // only the fallback for a database that has not been seeded.
    private int referralReward() {
        return settings.getInt("points.referral-reward", 250);
    }

    private int referralWelcome() {
        return settings.getInt("points.referral-welcome", 100);
    }

    private int pointsPerRide() {
        return settings.getInt("points.per-ride", 20);
    }

    /** How many points buy one unit of currency. 100 points per rupee at the default rate. */
    private int pointsPerCurrencyUnit() {
        return settings.getInt("points.per-currency-unit", 100);
    }

    /** Deliberately high: a cash referral is the first thing anyone farms. */
    private int driverQualifyingTrips() {
        return settings.getInt("referrals.driver-qualifying-trips", 25);
    }

    private int driverQualifyingDays() {
        return settings.getInt("referrals.driver-qualifying-days", 30);
    }

    private long driverRewardMinor() {
        return settings.getInt("referrals.driver-reward-minor", 50000);
    }

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
                (long) (balance / pointsPerCurrencyUnit()) * 100,
                pointsPerCurrencyUnit(),
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

        // The referrer's role decides the reward. A driver has no use for ride discounts, and a
        // rider has no payout to receive cash into.
        boolean referrerDrives = referrer.getRoles().contains(UserRole.DRIVER);

        Referral referral = new Referral();
        referral.setReferrerUserId(referrer.getId());
        referral.setRefereeUserId(refereeUserId);
        referral.setCode(code);
        referral.setRewardType(referrerDrives ? ReferralRewardType.CASH : ReferralRewardType.POINTS);
        if (referrerDrives) {
            // Cash referrals get a deadline. Without one a dormant account qualifies a year later,
            // long after whoever farmed it has been forgotten.
            referral.setQualifyBy(Instant.now().plus(Duration.ofDays(driverQualifyingDays())));
        }
        referralRepository.save(referral);
    }

    /**
     * Awards points for a finished ride, and settles a pending referral if this was the first one.
     *
     * <p>Every award carries an idempotency key, so a retried completion cannot pay twice.
     */
    @Transactional
    public void awardForCompletedRide(String riderUserId, String rideId) {
        award(riderUserId, pointsPerRide(), PointReason.RIDE_COMPLETED, "RIDE", rideId,
                "ride:" + rideId, "Points for a completed ride");

        referralRepository.findByRefereeUserId(riderUserId)
                .filter(referral -> referral.getStatus() == ReferralStatus.PENDING)
                .filter(referral -> referral.getRewardType() == ReferralRewardType.POINTS)
                .ifPresent(referral -> settle(referral, rideId));
    }

    /**
     * Progress on a cash referral, counted when the referred driver finishes a trip.
     *
     * <p>The bar is a run of real trips inside a window, not a signup: a driver referral pays real
     * money, and paying on signup buys accounts rather than drivers.
     *
     * @return the amount to pay the referrer, or zero if they have not qualified yet
     */
    @Transactional
    public long recordDriverTripForReferral(String driverUserId) {
        var maybeReferral = referralRepository.findByRefereeUserId(driverUserId)
                .filter(referral -> referral.getStatus() == ReferralStatus.PENDING)
                .filter(referral -> referral.getRewardType() == ReferralRewardType.CASH);

        if (maybeReferral.isEmpty()) {
            return 0;
        }
        Referral referral = maybeReferral.get();

        Instant now = Instant.now();
        if (referral.getQualifyBy() != null && referral.getQualifyBy().isBefore(now)) {
            referral.setStatus(ReferralStatus.VOID);
            referral.setVoidReason("Not enough trips within the qualifying window");
            referralRepository.save(referral);
            return 0;
        }

        referral.setQualifyingTrips(referral.getQualifyingTrips() + 1);

        if (referral.getQualifyingTrips() < driverQualifyingTrips()) {
            referralRepository.save(referral);
            return 0;
        }

        referral.setStatus(ReferralStatus.REWARDED);
        referral.setQualifiedAt(now);
        referralRepository.save(referral);
        log.info("Driver referral {} qualified after {} trips", referral.getId(),
                referral.getQualifyingTrips());
        return driverRewardMinor();
    }

    /** Who to pay, for a referral that just qualified. */
    @Transactional(readOnly = true)
    public String referrerOf(String refereeUserId) {
        return referralRepository.findByRefereeUserId(refereeUserId)
                .map(Referral::getReferrerUserId)
                .orElse(null);
    }

    private void settle(Referral referral, String rideId) {
        award(referral.getReferrerUserId(), referralReward(), PointReason.REFERRAL_REWARD,
                "REFERRAL", referral.getId(), "referral-reward:" + referral.getId(),
                "A friend you referred took their first ride");

        award(referral.getRefereeUserId(), referralWelcome(), PointReason.REFERRAL_WELCOME,
                "REFERRAL", referral.getId(), "referral-welcome:" + referral.getId(),
                "Welcome bonus for joining with a referral code");

        referral.setStatus(ReferralStatus.REWARDED);
        referral.setQualifiedAt(Instant.now());
        referralRepository.save(referral);
        log.info("Referral {} rewarded after ride {}", referral.getId(), rideId);
    }

    /** Spends points against a ride. Returns what was actually taken, which may be less than asked. */
    @Transactional
    public int redeem(String userId, int requestedPoints, long fareMinor, String rideId) {
        return redeem(userId, requestedPoints, fareMinor, PointReason.REDEEMED_ON_RIDE, "RIDE",
                rideId, "Redeemed against a ride");
    }

    /** The same, for a shuttle seat. The credit for a cancelled seat has to be spendable on one. */
    @Transactional
    public int redeemOnSeat(String userId, int requestedPoints, long fareMinor, String bookingId) {
        return redeem(userId, requestedPoints, fareMinor, PointReason.REDEEMED_ON_SEAT,
                "SHUTTLE_BOOKING", bookingId, "Redeemed against a shuttle seat");
    }

    /**
     * Spends points against a fare.
     *
     * <p>Capped by the fare, and that is the part that matters: the app offers the whole balance,
     * and settlement caps the discount at the fare anyway - so without this a rider with 6800
     * points taking a forty rupee ride paid nothing and lost all sixty-eight rupees of credit.
     * Never take points that cannot buy anything.
     */
    private int redeem(String userId, int requestedPoints, long fareMinor, PointReason reason,
            String referenceType, String referenceId, String note) {
        if (requestedPoints <= 0 || fareMinor <= 0) {
            return 0;
        }

        int balance = pointEntryRepository.balanceOf(userId);
        int spendable = Math.min(Math.min(requestedPoints, balance), pointsFor(fareMinor));
        // Only whole currency units are worth redeeming.
        int usable = (spendable / pointsPerCurrencyUnit()) * pointsPerCurrencyUnit();
        if (usable <= 0) {
            return 0;
        }

        award(userId, -usable, reason, referenceType, referenceId, "redeem:" + referenceId, note);
        return usable;
    }

    /**
     * Credits a cancelled shuttle seat back as points.
     *
     * <p>Not a gateway refund: the money has already settled, and a card refund costs a fee and
     * takes days. Points are instant, spend against the next fare, and are the same value to the
     * rider - which is why the rate here is the one redemption uses, not a worse one.
     */
    @Transactional
    public void creditCancelledShuttleSeat(String userId, long amountMinor, String bookingId) {
        int points = pointsFor(amountMinor);
        if (points <= 0) {
            return;
        }
        award(userId, points, PointReason.SHUTTLE_CANCELLED, "SHUTTLE_BOOKING", bookingId,
                "shuttle-cancel:" + bookingId, "Credit for a cancelled shuttle seat");
    }

    /** Points that an amount of money is worth. The inverse of {@link #valueOf(int)}. */
    public int pointsFor(long amountMinor) {
        return (int) (amountMinor / 100 * pointsPerCurrencyUnit());
    }

    /** Minor units a number of points is worth at the current rate. */
    public long valueOf(int points) {
        return (long) (points / pointsPerCurrencyUnit()) * 100;
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
