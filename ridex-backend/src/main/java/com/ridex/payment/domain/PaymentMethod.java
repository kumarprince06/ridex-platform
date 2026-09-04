package com.ridex.payment.domain;

public enum PaymentMethod {
    // Still the majority in this market. Settled by the driver collecting, not by a gateway.
    CASH,
    CARD,
    UPI,
    // The fare was covered entirely by points or a promotion; nothing is collected.
    NONE
}
