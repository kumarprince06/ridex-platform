package com.ridex.support.domain;

/**
 * What a ticket is about.
 *
 * <p>A short fixed list on purpose: it routes the queue. The detail goes in the message, where
 * somebody can write what actually happened instead of picking the nearest wrong option.
 */
public enum TicketCategory {
    BILLING,
    FARE_DISPUTE,
    REFUND_REQUEST,
    LOST_ITEM,
    DRIVER_BEHAVIOUR,
    RIDER_BEHAVIOUR,
    SAFETY,
    ACCOUNT,
    PAYOUT,
    APP_PROBLEM,
    OTHER
}
