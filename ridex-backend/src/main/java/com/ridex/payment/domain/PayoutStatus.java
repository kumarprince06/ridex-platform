package com.ridex.payment.domain;

public enum PayoutStatus {

    /** Batched and owed, not yet sent to a bank. */
    PENDING,
    /** Handed to the bank or provider; the money has left but is not confirmed. */
    PROCESSING,
    PAID,
    /** Bounced. The earnings are released back to unsettled so the next batch picks them up. */
    FAILED;

    public boolean isTerminal() {
        return this == PAID || this == FAILED;
    }
}
