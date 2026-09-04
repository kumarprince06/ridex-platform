package com.ridex.payment;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.ridex.shared.money.Money;

/**
 * Cash, collected by the driver.
 *
 * <p>Not a stub: cash is the majority payment method in this market, and it genuinely has no
 * gateway. The platform records that the fare is owed and settles it against the driver's
 * earnings - the driver has already been handed the money, so the commission is what they owe
 * back rather than what they are paid.
 *
 * <p>ponytail: this is also the only provider wired today. A card gateway is a second
 * implementation of this interface and nothing above it changes.
 */
@Component
public class CashPaymentProvider implements PaymentProvider {

    @Override
    public String name() {
        return "CASH";
    }

    @Override
    public ProviderPayment createPaymentIntent(Money amount, String reference, String idempotencyKey) {
        // Nothing to authorise: the money changes hands in the car.
        return new ProviderPayment("cash_" + UUID.randomUUID(), "SUCCEEDED", null);
    }

    @Override
    public ProviderPayment confirmPayment(String providerPaymentId) {
        return new ProviderPayment(providerPaymentId, "SUCCEEDED", null);
    }

    @Override
    public ProviderRefund refundPayment(String providerPaymentId, Money amount, String idempotencyKey) {
        // A cash refund is an adjustment against the driver's next payout, not a gateway call.
        return new ProviderRefund("cashrefund_" + UUID.randomUUID(), "SUCCEEDED");
    }

    @Override
    public boolean verifyWebhook(String payload, String signature) {
        // Cash has no webhooks. Returning true would let anything be posted as a cash event.
        return false;
    }

    @Override
    public ProviderEvent parseWebhook(String payload) {
        throw new UnsupportedOperationException("Cash payments have no webhooks");
    }
}
