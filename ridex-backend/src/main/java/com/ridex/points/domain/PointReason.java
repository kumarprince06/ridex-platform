package com.ridex.points.domain;

/** Why points moved. Stored as the name, so entries are never renumbered. */
public enum PointReason {

    RIDE_COMPLETED,
    // Paid when the referee finishes their first ride, not when they sign up: signups are free to
    // manufacture, rides are not.
    REFERRAL_REWARD,
    REFERRAL_WELCOME,
    REDEEMED_ON_RIDE,
    // Spent on a shuttle seat. Its own reason, not REDEEMED_ON_RIDE: an entry that names the
    // wrong thing is worse than no entry, and this is the ledger a rider reads back.
    REDEEMED_ON_SEAT,
    // A cancelled shuttle seat comes back as points rather than money: the fare has already
    // cleared the gateway, and points keep the rider on the platform instead of off it.
    SHUTTLE_CANCELLED,
    ADMIN_ADJUSTMENT
}
