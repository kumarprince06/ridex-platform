package com.ridex.admin.dto;

import java.time.Instant;

import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;

public record AdminPaymentResponse(
        String id,
        String tripId,
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
