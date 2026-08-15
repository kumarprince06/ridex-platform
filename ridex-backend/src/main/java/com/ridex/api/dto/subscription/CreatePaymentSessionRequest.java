package com.ridex.api.dto.subscription;

import com.ridex.domain.subscription.PaymentProviderType;

import jakarta.validation.constraints.NotNull;

public record CreatePaymentSessionRequest(
        @NotNull(message = "Payment provider is required")
        PaymentProviderType paymentProvider) {
}
