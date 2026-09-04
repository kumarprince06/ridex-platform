package com.ridex.notification;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "notification_outbox")
public class OutboxMessage {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private DeliveryChannel channel;

    @Column(name = "recipient", nullable = false, length = 255)
    private String recipient;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "text")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OutboxStatus status = OutboxStatus.PENDING;

    @Column(name = "attempts", nullable = false)
    private short attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        Instant now = Instant.now();
        this.createdAt = now;
        if (nextAttemptAt == null) {
            this.nextAttemptAt = now;
        }
    }
}
