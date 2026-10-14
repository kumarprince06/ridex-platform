package com.ridex.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import com.ridex.IntegrationTest;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

/** Webhooks that fail are counted by why, so an alert fires before payments quietly stop settling. */
@IntegrationTest
class PaymentWebhookMetricsTest {

    @Autowired private PaymentWebhookController controller;
    @Autowired private PaymentWebhookService service;
    @Autowired private MeterRegistry meterRegistry;

    @Test
    void anInvalidSignatureIsRejectedAndCounted() {
        double before = failures("invalid_signature");

        // The build has no webhook secret, so no signature can verify.
        assertThatThrownBy(() -> controller.receive("{}", "forged", "evt_" + System.nanoTime()))
                .isInstanceOf(ResponseStatusException.class);

        assertThat(failures("invalid_signature")).isEqualTo(before + 1);
    }

    @Test
    void anUnparseablePayloadIsKeptAndCounted() {
        double before = failures("unparseable");

        service.handle("{not json", "evt_" + System.nanoTime());

        assertThat(failures("unparseable")).isEqualTo(before + 1);
    }

    private double failures(String reason) {
        Counter counter = meterRegistry.find("ridex.payments.webhooks.failed").tag("reason", reason).counter();
        return counter == null ? 0 : counter.count();
    }
}
