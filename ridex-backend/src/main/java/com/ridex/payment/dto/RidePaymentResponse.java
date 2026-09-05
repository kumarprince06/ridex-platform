package com.ridex.payment.dto;

import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;

/**
 * What the rider's app needs to settle a trip.
 *
 * <p>Carries the gateway order id and the publishable key, which is everything checkout needs and
 * nothing it should not have: the key secret stays on the server, and the amount comes from here
 * rather than from the client, so an app cannot open a checkout for a fare it chose itself.
 */
public record RidePaymentResponse(
        String paymentId,
        PaymentMethod method,
        PaymentStatus status,
        String currency,
        long amountMinor,

        /** Null for cash, and for a fare a promotion covered entirely. */
        String gatewayOrderId,
        /** The publishable key. Public by design - it identifies the merchant, it does not authorise. */
        String gatewayKeyId,

        /** True when there is nothing left to collect: cash, free, or already captured. */
        boolean settled) {
}
