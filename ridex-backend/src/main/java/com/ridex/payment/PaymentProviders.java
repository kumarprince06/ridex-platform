package com.ridex.payment;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.ridex.payment.domain.PaymentMethod;
import com.ridex.shared.exception.ConflictException;

import lombok.RequiredArgsConstructor;

/**
 * Which provider clears which method.
 *
 * <p>Named in configuration rather than in code, so adding a second gateway is a new
 * {@link PaymentProvider} and one property - nothing that charges money has to change. Cash is
 * never the configured gateway: it is settled by a person at the kerb, and it has a provider only
 * so the rest of the code has one path for every method.
 */
@Component
@RequiredArgsConstructor
public class PaymentProviders {

    private final List<PaymentProvider> providers;

    @Value("${app.payments.gateway:RAZORPAY}")
    private String gateway;

    public PaymentProvider forMethod(PaymentMethod method) {
        String wanted = method == PaymentMethod.CASH ? "CASH" : gateway;

        return providers.stream()
                .filter(provider -> provider.name().equals(wanted))
                .findFirst()
                .orElseThrow(() -> new ConflictException(
                        "No payment provider is configured for " + method + "."));
    }
}
