package com.ridex.points.domain;

/** Why points moved. Stored as the name, so entries are never renumbered. */
public enum PointReason {

    RIDE_COMPLETED,
    // Paid when the referee finishes their first ride, not when they sign up: signups are free to
    // manufacture, rides are not.
    REFERRAL_REWARD,
    REFERRAL_WELCOME,
    REDEEMED_ON_RIDE,
    ADMIN_ADJUSTMENT
}
