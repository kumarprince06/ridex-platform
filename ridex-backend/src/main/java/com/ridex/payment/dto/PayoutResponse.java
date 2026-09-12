package com.ridex.payment.dto;

import java.time.Instant;

import com.ridex.driver.dto.PayoutAccountResponse;
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
        Instant settledAt,
        /**
         * Where this money is going, masked, or null when the driver has not said yet.
         *
         * <p>On the payout rather than looked up beside it: ops settling a batch needs to see that
         * a row has nowhere to go before they mark it paid, not after.
         */
        String payoutAccountHolder,
        String payoutAccountMasked,
        String payoutIfsc) {

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
                payout.getSettledAt(),
                payout.getDriver().getPayoutAccountHolder(),
                payout.getDriver().getPayoutAccountNumber() == null
                        ? null
                        : PayoutAccountResponse.mask(payout.getDriver().getPayoutAccountNumber()),
                payout.getDriver().getPayoutIfsc());
    }
}
