package com.ridex.admin.dto;

import java.time.Instant;

import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;

public record AdminPaymentResponse(
        String id,
        /** Null when the payment is for a shuttle seat rather than a trip. */
        String tripId,
        /** Null when it is for a trip. Exactly one of the two is set. */
        String shuttleBookingId,
        String riderEmail,
        PaymentMethod method,
        PaymentStatus status,
        String currency,
        long grossAmountMinor,
        long discountAmountMinor,
        long netAmountMinor,
        Instant createdAt,
        Instant paidAt) {
}
