package com.ridex.payment.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One webhook, as it arrived.
 *
 * <p>The row is the deduplication: {@code (provider, provider_event_id)} is unique, so a gateway
 * that retries - and every gateway retries - inserts nothing the second time. Without it a
 * redelivered "payment captured" would settle the same trip twice.
 *
 * <p>The raw payload is kept because a dispute six months later is argued from what the gateway
 * actually said, not from what this application concluded from it.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "payment_events")
public class PaymentEvent {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    /** Null when the event names a payment this platform has never heard of. */
    @Column(name = "payment_id", length = 26)
    private String paymentId;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_event_id", nullable = false, length = 160)
    private String providerEventId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "payload", columnDefinition = "text")
    private String payload;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}
