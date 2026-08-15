package com.ridex.infrastructure.payment;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.ridex.domain.subscription.PaymentProviderType;

@Component
public class PaymentGatewayRegistry {

    private final Map<PaymentProviderType, PaymentGateway> gateways;

    public PaymentGatewayRegistry(List<PaymentGateway> paymentGateways) {
        this.gateways = paymentGateways.stream()
                .collect(Collectors.toMap(PaymentGateway::providerType, Function.identity()));
    }

    public PaymentGateway getGateway(PaymentProviderType providerType) {
        PaymentGateway gateway = gateways.get(providerType);
        if (gateway == null) {
            throw new IllegalStateException("No payment gateway configured for provider: " + providerType);
        }
        return gateway;
    }
}
