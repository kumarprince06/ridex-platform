package com.ridex.domain.driver;

import java.util.EnumSet;
import java.util.Set;

/**
 * The driver onboarding machine from docs/11-State-Machines.md.
 *
 * <p>Legal transitions live here rather than in whichever service happens to perform them, because
 * docs/11 requires the machine be validated in one boundary. A second copy of these rules is a
 * second place for them to drift.
 *
 * <p>This is also the approval status. The ERD lists approval_status and onboarding_status
 * separately, but there is only one machine and its terminal states are the approval outcome.
 */
public enum DriverOnboardingStatus {

    REGISTERED,
    PROFILE_SUBMITTED,
    DOCUMENTS_SUBMITTED,
    UNDER_REVIEW,
    APPROVED,
    REJECTED,
    SUSPENDED;

    private static final Set<DriverOnboardingStatus> CAN_DRIVE = EnumSet.of(APPROVED);

    public boolean canTransitionTo(DriverOnboardingStatus next) {
        return switch (this) {
            case REGISTERED -> next == PROFILE_SUBMITTED;
            case PROFILE_SUBMITTED -> next == DOCUMENTS_SUBMITTED;
            case DOCUMENTS_SUBMITTED -> next == UNDER_REVIEW;
            // Review is the only place an application is decided, either way.
            case UNDER_REVIEW -> next == APPROVED || next == REJECTED;
            // An approved driver can be pulled off the road; a suspended one can be reinstated.
            case APPROVED -> next == SUSPENDED;
            case SUSPENDED -> next == APPROVED || next == REJECTED;
            // Terminal. A rejected applicant re-applies as a new submission, so the trail of why
            // they were rejected is not overwritten.
            case REJECTED -> false;
        };
    }

    /** Whether a driver in this state may go online and receive offers. */
    public boolean isEligibleToDrive() {
        return CAN_DRIVE.contains(this);
    }
}
