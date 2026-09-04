package com.ridex.points;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.points.domain.PointReason;
import com.ridex.points.domain.ReferralStatus;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;

@SpringBootTest
@Transactional
class PointsServiceTest {

    @Autowired private PointsService pointsService;
    @Autowired private PointEntryRepository pointEntryRepository;
    @Autowired private ReferralRepository referralRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void aReferralPaysNothingUntilTheRefereeActuallyRides() {
        String referrer = newUser();
        String referee = newUser();
        String code = pointsService.balance(referrer).referralCode();

        pointsService.applyReferralCode(referee, code);

        // Signups are free to manufacture. Rides are not, so nothing is paid yet.
        assertThat(pointEntryRepository.balanceOf(referrer)).isZero();
        assertThat(pointEntryRepository.balanceOf(referee)).isZero();
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.PENDING);

        pointsService.awardForCompletedRide(referee, "ride-1");

        assertThat(pointEntryRepository.balanceOf(referrer)).isEqualTo(250);
        // Welcome bonus plus the ride itself.
        assertThat(pointEntryRepository.balanceOf(referee)).isEqualTo(120);
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.REWARDED);
    }

    @Test
    void aRetriedCompletionCannotPayTwice() {
        String referrer = newUser();
        String referee = newUser();
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        pointsService.awardForCompletedRide(referee, "ride-1");
        pointsService.awardForCompletedRide(referee, "ride-1");

        // Idempotency key on every award, so a retry is free rather than doubling the payout.
        assertThat(pointEntryRepository.balanceOf(referrer)).isEqualTo(250);
        assertThat(pointEntryRepository.balanceOf(referee)).isEqualTo(120);
    }

    @Test
    void aSecondRideDoesNotSettleTheReferralAgain() {
        String referrer = newUser();
        String referee = newUser();
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        pointsService.awardForCompletedRide(referee, "ride-1");
        pointsService.awardForCompletedRide(referee, "ride-2");

        assertThat(pointEntryRepository.balanceOf(referrer)).isEqualTo(250);
        // Two rides at 20, plus the 100 welcome.
        assertThat(pointEntryRepository.balanceOf(referee)).isEqualTo(140);
    }

    @Test
    void referringYourselfIsRefused() {
        String user = newUser();
        String code = pointsService.balance(user).referralCode();

        assertThatThrownBy(() -> pointsService.applyReferralCode(user, code))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void anAccountCanOnlyBeReferredOnce() {
        String first = newUser();
        String second = newUser();
        String referee = newUser();

        pointsService.applyReferralCode(referee, pointsService.balance(first).referralCode());

        assertThatThrownBy(() ->
                pointsService.applyReferralCode(referee, pointsService.balance(second).referralCode()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void anUnknownCodeIsNotFound() {
        assertThatThrownBy(() -> pointsService.applyReferralCode(newUser(), "ZZZZZZZ"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void redeemingSpendsOnlyWholeCurrencyUnitsAndNeverMoreThanTheBalance() {
        String user = newUser();
        pointsService.awardForCompletedRide(user, "ride-1");   // 20 points
        pointsService.awardForCompletedRide(user, "ride-2");   // 40
        pointsService.awardForCompletedRide(user, "ride-3");   // 60
        pointsService.awardForCompletedRide(user, "ride-4");   // 80
        pointsService.awardForCompletedRide(user, "ride-5");   // 100
        pointsService.awardForCompletedRide(user, "ride-6");   // 120

        // 100 points to the rupee: 120 available redeems 100, and the remainder stays.
        int spent = pointsService.redeem(user, 120, "ride-7");

        assertThat(spent).isEqualTo(100);
        assertThat(pointEntryRepository.balanceOf(user)).isEqualTo(20);
    }

    @Test
    void redeemingMoreThanTheBalanceTakesOnlyWhatIsThere() {
        String user = newUser();
        pointsService.awardForCompletedRide(user, "ride-1");

        // 20 points is under one rupee, so nothing is spent rather than going negative.
        assertThat(pointsService.redeem(user, 5000, "ride-2")).isZero();
        assertThat(pointEntryRepository.balanceOf(user)).isEqualTo(20);
    }

    @Test
    void theBalanceIsTheSumOfEntriesRatherThanAStoredNumber() {
        String user = newUser();
        pointsService.awardForCompletedRide(user, "ride-1");

        var balance = pointsService.balance(user);

        assertThat(balance.balance()).isEqualTo(20);
        assertThat(balance.recent()).extracting(entry -> entry.reason())
                .containsExactly(PointReason.RIDE_COMPLETED);
        // Points are not money: the value shown is what the current rate would take off a fare.
        assertThat(balance.currency()).isEqualTo("INR");
    }

    private String newUser() {
        User user = new User();
        user.setEmail("points-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        return userRepository.save(user).getId();
    }
}
