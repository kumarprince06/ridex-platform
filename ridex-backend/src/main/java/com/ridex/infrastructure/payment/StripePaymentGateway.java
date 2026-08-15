package com.ridex.infrastructure.payment;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.ridex.domain.subscription.PaymentProviderType;

@Component
public class StripePaymentGateway implements PaymentGateway {

    @Override
    public PaymentProviderType providerType() {
        return PaymentProviderType.STRIPE;
    }

    @Override
    public String createCheckoutSession(String tenantId, String subscriptionId, BigDecimal amount, String currencyCode) {
        return "stripe_checkout_session_for_" + tenantId + "_" + subscriptionId + "_" + amount + "_" + currencyCode;
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        return payload != null && signature != null && !payload.isBlank() && !signature.isBlank();
    }

    @Override
    public String capturePayment(String providerPaymentId) {
        return providerPaymentId;
    }
}
