package com.ridex.domain.driver;

public enum DriverDocumentStatus {

    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    /** Was approved, but its expiry date has passed. Not the same as never having been valid. */
    EXPIRED
}
