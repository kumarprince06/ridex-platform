package com.ridex.points;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.points.domain.ReferralRewardType;
import com.ridex.points.domain.ReferralStatus;

/**
 * Driver referrals pay cash, riders' pay points, and the cash bar is deliberately much higher.
 *
 * <p>A rider referral costs the platform a discount it sets the value of. A driver referral costs
 * real money, so it is the first thing anyone tries to farm.
 */
@SpringBootTest
@Transactional
class DriverReferralTest {

    @Autowired private PointsService pointsService;
    @Autowired private ReferralRepository referralRepository;
    @Autowired private PointEntryRepository pointEntryRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void aDriverReferringSomebodyEarnsCashRatherThanPoints() {
        String referrer = newUser(UserRole.DRIVER);
        String referee = newUser(UserRole.DRIVER);

        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        // The referrer's role decides it: a driver has no use for ride discounts.
        var referral = referralRepository.findByRefereeUserId(referee).orElseThrow();
        assertThat(referral.getRewardType()).isEqualTo(ReferralRewardType.CASH);
        assertThat(referral.getQualifyBy()).isAfter(Instant.now());
    }

    @Test
    void aRiderReferringSomebodyStillEarnsPoints() {
        String referrer = newUser(UserRole.RIDER);
        String referee = newUser(UserRole.RIDER);

        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getRewardType())
                .isEqualTo(ReferralRewardType.POINTS);
    }

    @Test
    void aDriverReferralPaysNothingUntilTheTripCountIsReached() {
        String referrer = newUser(UserRole.DRIVER);
        String referee = newUser(UserRole.DRIVER);
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        // Twenty-four trips short of the twenty-five threshold: still nothing.
        for (int i = 0; i < 24; i++) {
            assertThat(pointsService.recordDriverTripForReferral(referee)).isZero();
        }
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.PENDING);

        long payout = pointsService.recordDriverTripForReferral(referee);

        assertThat(payout).isEqualTo(50000);
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.REWARDED);
    }

    @Test
    void aQualifiedDriverReferralDoesNotPayAgainOnTheNextTrip() {
        String referrer = newUser(UserRole.DRIVER);
        String referee = newUser(UserRole.DRIVER);
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        for (int i = 0; i < 25; i++) {
            pointsService.recordDriverTripForReferral(referee);
        }

        // Already REWARDED, so further trips are just trips.
        assertThat(pointsService.recordDriverTripForReferral(referee)).isZero();
    }

    @Test
    void aDriverReferralExpiresIfTheWindowClosesFirst() {
        String referrer = newUser(UserRole.DRIVER);
        String referee = newUser(UserRole.DRIVER);
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        var referral = referralRepository.findByRefereeUserId(referee).orElseThrow();
        referral.setQualifyBy(Instant.now().minusSeconds(1));
        referralRepository.save(referral);

        // Without a deadline a dormant account qualifies a year later, long after whoever farmed
        // it has been forgotten.
        assertThat(pointsService.recordDriverTripForReferral(referee)).isZero();
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.VOID);
    }

    @Test
    void aDriverReferralNeverAwardsPoints() {
        String referrer = newUser(UserRole.DRIVER);
        String referee = newUser(UserRole.DRIVER);
        pointsService.applyReferralCode(referee, pointsService.balance(referrer).referralCode());

        // The referee takes a ride as a passenger: that settles rider referrals, not driver ones.
        pointsService.awardForCompletedRide(referee, "ride-1");

        assertThat(pointEntryRepository.balanceOf(referrer)).isZero();
        assertThat(referralRepository.findByRefereeUserId(referee).orElseThrow().getStatus())
                .isEqualTo(ReferralStatus.PENDING);
    }

    private String newUser(UserRole role) {
        User user = new User();
        user.setEmail("refer-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user).getId();
    }
}
