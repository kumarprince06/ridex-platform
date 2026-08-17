package com.ridex.domain.driver;

public enum DriverDocumentType {

    DRIVING_LICENCE,
    IDENTITY_PROOF,
    ADDRESS_PROOF,
    VEHICLE_REGISTRATION,
    VEHICLE_INSURANCE,
    BACKGROUND_CHECK;

    /**
     * Documents an application must carry before it can go to review. Vehicle paperwork is not
     * here: it is checked against the vehicle, which may be added or replaced after approval.
     */
    public boolean isRequiredForReview() {
        return this == DRIVING_LICENCE || this == IDENTITY_PROOF;
    }
}
