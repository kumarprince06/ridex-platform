package com.ridex.payment;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.ridex.payment.PaymentProvider.ProviderPayment;

class ProviderPaymentTest {

    @Test
    void aPaymentSettlesOnlyTheOrderAndAmountItWasMadeFor() {
        var paid = new ProviderPayment("pay_1", "SUCCEEDED", null, "order_trip", 46330);

        assertThat(paid.isFor("order_trip", 46330)).isTrue();
        // Captured on a cheaper order, or for a different amount: never a settlement for this one.
        assertThat(paid.isFor("order_other", 46330)).isFalse();
        assertThat(paid.isFor("order_trip", 90000)).isFalse();
    }

    @Test
    void cashHasNoOrderToReplay() {
        assertThat(new ProviderPayment("cash_1", "SUCCEEDED", null).isFor("order_trip", 46330)).isTrue();
    }
}
