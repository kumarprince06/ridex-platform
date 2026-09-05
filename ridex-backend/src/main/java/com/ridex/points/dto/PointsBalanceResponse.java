package com.ridex.points.dto;

import java.util.List;

/**
 * Points, and what they are worth if redeemed today.
 *
 * <p>The value is shown as an amount but is never a balance the rider can withdraw - it is what
 * the current rate would take off a fare, and the rate is the platform's to change.
 */
public record PointsBalanceResponse(
        int balance,
        String referralCode,
        int referralsPending,
        int referralsRewarded,
        String currency,
        long redeemableValueMinor,
        int pointsPerCurrencyUnit,
        /** The most that may be spent on one ride or one seat, whatever the balance. */
        int maxRedeemPerJourney,
        List<PointEntryResponse> recent) {
}
