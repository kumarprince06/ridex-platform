package com.ridex.payment.dto;

import java.time.Instant;

import com.ridex.payment.domain.DriverPayout;
import com.ridex.payment.domain.PayoutStatus;

public record PayoutResponse(
        String id,
        String driverId,
        String driverEmail,
        String currency,
        long amountMinor,
        PayoutStatus status,
        Instant periodStart,
        Instant periodEnd,
        String reference,
        String failureReason,
        Instant createdAt,
        Instant settledAt) {

    public static PayoutResponse of(DriverPayout payout) {
        return new PayoutResponse(
                payout.getId(),
                payout.getDriver().getId(),
                payout.getDriver().getUser().getEmail(),
                payout.getCurrency(),
                payout.getAmountMinor(),
                payout.getStatus(),
                payout.getPeriodStart(),
                payout.getPeriodEnd(),
                payout.getReference(),
                payout.getFailureReason(),
                payout.getCreatedAt(),
                payout.getSettledAt());
    }
}
