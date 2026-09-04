package com.ridex.payment.dto;

import java.time.Instant;

import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;

public record PaymentResponse(
        String id,
        String tripId,
        PaymentMethod method,
        PaymentStatus status,
        String currency,
        long grossAmountMinor,
        // What points and promotions took off. Funded by the platform, not the driver.
        long discountAmountMinor,
        long netAmountMinor,
        Instant paidAt) {
}
