package com.ridex.support.domain;

/**
 * What a ticket is about.
 *
 * <p>A short fixed list on purpose: it routes the queue. The detail goes in the message, where
 * somebody can write what actually happened instead of picking the nearest wrong option.
 */
public enum TicketCategory {

    BILLING("Billing"),
    FARE_DISPUTE("Fare dispute"),
    REFUND_REQUEST("Refund request"),
    LOST_ITEM("Lost item"),
    DRIVER_BEHAVIOUR("Driver behaviour"),
    RIDER_BEHAVIOUR("Rider behaviour"),
    SAFETY("Safety"),
    ACCOUNT("Account"),
    PAYOUT("Payout"),
    APP_PROBLEM("App problem"),
    OTHER("Something else");

    private final String label;

    TicketCategory(String label) {
        this.label = label;
    }

    /**
     * The words a person picks from.
     *
     * <p>Here rather than in each app: three clients showing three different names for the same
     * queue is how a category stops meaning anything to the people working it.
     */
    public String label() {
        return label;
    }

    /** Which categories that role can raise. A rider has no payouts; a driver has no fare to dispute. */
    public boolean isFor(String role) {
        return switch (this) {
            case PAYOUT, RIDER_BEHAVIOUR -> "DRIVER".equals(role);
            case FARE_DISPUTE, DRIVER_BEHAVIOUR, REFUND_REQUEST -> "RIDER".equals(role);
            default -> true;
        };
    }
}
