package com.ridex.driver.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

class DriverOnboardingStatusTest {

    @Test
    void walksTheHappyPathToApproved() {
        DriverProfile driver = new DriverProfile();
        assertThat(driver.getOnboardingStatus()).isEqualTo(DriverOnboardingStatus.REGISTERED);

        driver.transitionTo(DriverOnboardingStatus.PROFILE_SUBMITTED);
        driver.transitionTo(DriverOnboardingStatus.DOCUMENTS_SUBMITTED);
        driver.transitionTo(DriverOnboardingStatus.UNDER_REVIEW);
        driver.transitionTo(DriverOnboardingStatus.APPROVED);

        assertThat(driver.isEligibleToDrive()).isTrue();
    }

    @Test
    void refusesToSkipReview() {
        DriverProfile driver = new DriverProfile();

        // The whole point of onboarding is that nobody reaches APPROVED without passing review.
        assertThatThrownBy(() -> driver.transitionTo(DriverOnboardingStatus.APPROVED))
                .isInstanceOf(IllegalStateException.class);

        assertThat(driver.isEligibleToDrive()).isFalse();
    }

    @Test
    void treatsRejectedAsTerminal() {
        for (DriverOnboardingStatus next : DriverOnboardingStatus.values()) {
            assertThat(DriverOnboardingStatus.REJECTED.canTransitionTo(next)).isFalse();
        }
    }

    @Test
    void allowsSuspensionAndReinstatement() {
        assertThat(DriverOnboardingStatus.APPROVED.canTransitionTo(DriverOnboardingStatus.SUSPENDED)).isTrue();
        assertThat(DriverOnboardingStatus.SUSPENDED.canTransitionTo(DriverOnboardingStatus.APPROVED)).isTrue();
    }

    @Test
    void onlyApprovedDriversMayDrive() {
        Set<DriverOnboardingStatus> eligible = EnumSet.noneOf(DriverOnboardingStatus.class);
        for (DriverOnboardingStatus status : DriverOnboardingStatus.values()) {
            if (status.isEligibleToDrive()) {
                eligible.add(status);
            }
        }

        // A suspended driver holding a stale token must not pass an eligibility check.
        assertThat(eligible).containsExactly(DriverOnboardingStatus.APPROVED);
    }
}
