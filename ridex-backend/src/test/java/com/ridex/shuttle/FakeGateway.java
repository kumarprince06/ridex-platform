package com.ridex.shuttle;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ridex.payment.PaymentProvider;
import com.ridex.payment.PaymentProviders;

/** Seats are prepaid, so shuttle tests need a gateway that opens orders and says yes. */
final class FakeGateway {

    private FakeGateway() {
    }

    static void install(PaymentProviders providers) {
        PaymentProvider gateway = mock(PaymentProvider.class);
        when(gateway.name()).thenReturn("RAZORPAY");
        when(gateway.createPaymentIntent(any(), anyString(), anyString()))
                .thenAnswer(call -> new PaymentProvider.ProviderPayment(
                        "order_" + call.getArgument(1), "REQUIRES_ACTION", null));
        when(gateway.confirmPayment(anyString()))
                .thenAnswer(call -> new PaymentProvider.ProviderPayment(
                        call.getArgument(0), "SUCCEEDED", null));
        when(providers.forMethod(any())).thenReturn(gateway);
    }
}
