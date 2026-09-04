package com.ridex.payment;

import com.ridex.shared.money.Money;

/**
 * A payment gateway, from the platform's side.
 *
 * <p>Provider-neutral on purpose (docs/13): the day this platform changes gateway, the change
 * should be one class in this package and nothing above it.
 */
public interface PaymentProvider {

    String name();

    /**
     * Starts a payment. The idempotency key is not optional: mobile clients on bad networks retry,
     * and a retry without one is a second charge.
     */
    ProviderPayment createPaymentIntent(Money amount, String reference, String idempotencyKey);

    ProviderPayment confirmPayment(String providerPaymentId);

    ProviderRefund refundPayment(String providerPaymentId, Money amount, String idempotencyKey);

    /** Verified before the body is parsed: an unverified payload is attacker input. */
    boolean verifyWebhook(String payload, String signature);

    ProviderEvent parseWebhook(String payload);

    record ProviderPayment(String providerPaymentId, String status, String failureReason) {
    }

    record ProviderRefund(String providerRefundId, String status) {
    }

    record ProviderEvent(String providerEventId, String type, String providerPaymentId) {
    }
}
