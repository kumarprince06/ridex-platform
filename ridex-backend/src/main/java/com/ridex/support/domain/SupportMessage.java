package com.ridex.support.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One message in a ticket. Append-only: an edited support history is not a history. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "support_messages")
public class SupportMessage {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "ticket_id", nullable = false, length = 26, updatable = false)
    private String ticketId;

    @Column(name = "author_user_id", length = 26, updatable = false)
    private String authorUserId;

    @Column(name = "author_role", nullable = false, length = 20, updatable = false)
    private String authorRole;

    @Column(name = "body", nullable = false, length = 4000, updatable = false)
    private String body;

    // Agent-to-agent. Filtered out of every response the ticket's owner can see.
    @Column(name = "internal", nullable = false, updatable = false)
    private boolean internal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
