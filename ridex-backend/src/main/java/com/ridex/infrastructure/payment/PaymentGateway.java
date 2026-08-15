package com.ridex.infrastructure.payment;

import java.math.BigDecimal;

import com.ridex.domain.subscription.PaymentProviderType;

public interface PaymentGateway {

    PaymentProviderType providerType();

    String createCheckoutSession(String tenantId, String subscriptionId, BigDecimal amount, String currencyCode);

    boolean verifyWebhookSignature(String payload, String signature);

    String capturePayment(String providerPaymentId);
}
