package com.ridex.shuttle.dto;

import java.time.LocalDate;

import com.ridex.payment.domain.PaymentStatus;

public record PassResponse(
        String id,
        String productName,
        String routeName,
        LocalDate startsOn,
        LocalDate endsOn,
        int rideLimit,
        int ridesUsed,
        String currency,
        long pricePaidMinor,
        /** Points spent on it, and what they took off the price. */
        int redeemedPoints,
        long discountMinor,
        String status,
        /**
         * Present while the pass is still unpaid.
         *
         * <p>A pass is prepaid, so it does nothing until this has cleared - and a rider who backed
         * out of checkout reopens it from their passes, which needs the order id.
         */
        Checkout checkout) {

    /** What the app needs to open the gateway, and nothing it should not have. */
    public record Checkout(String gatewayOrderId, String gatewayKeyId, long amountMinor,
            String currency, PaymentStatus status) {
    }
}
