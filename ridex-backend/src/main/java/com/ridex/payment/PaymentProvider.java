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

    /**
     * orderId and amountMinor are what the gateway says the payment was for; null and 0 when it
     * does not say. A caller crediting money checks both, or one captured payment could be
     * replayed against any order.
     */
    record ProviderPayment(String providerPaymentId, String status, String failureReason,
            String orderId, long amountMinor) {

        public ProviderPayment(String providerPaymentId, String status, String failureReason) {
            this(providerPaymentId, status, failureReason, null, 0);
        }

        /**
         * Whether this payment was made against our order for our amount. A provider that reports
         * no order (cash) has nothing to replay; one that does must match, or a payment captured on
         * a cheap order could settle an expensive one.
         */
        public boolean isFor(String expectedOrderId, long expectedAmountMinor) {
            return orderId == null || (orderId.equals(expectedOrderId) && amountMinor == expectedAmountMinor);
        }
    }

    record ProviderRefund(String providerRefundId, String status) {
    }

    record ProviderEvent(String providerEventId, String type, String providerPaymentId) {
    }
}
