package com.ridex.points.domain;

/**
 * What a referral pays.
 *
 * <p>Decided by the referrer's role, not the referee's: a rider wants a cheaper ride, a driver
 * wants income, and paying either in the other's currency is a reward they cannot use.
 */
public enum ReferralRewardType {
    POINTS,
    CASH
}
