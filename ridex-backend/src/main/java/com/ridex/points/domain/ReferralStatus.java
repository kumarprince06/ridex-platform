package com.ridex.points.domain;

public enum ReferralStatus {
    // Signed up with the code, has not ridden yet. Nothing is paid at this stage.
    PENDING,
    // The referee finished a ride. Both sides have been awarded.
    REWARDED,
    // Closed without payment - self-referral, a blocked account, or an abuse decision.
    VOID
}
