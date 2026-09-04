package com.ridex.admin.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only record of what operations did. Never updated, never deleted by application code. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "actor_user_id", length = 26, updatable = false)
    private String actorUserId;

    // Copied, not joined: the email at the time of the action, even if the account is renamed.
    @Column(name = "actor_email", length = 255, updatable = false)
    private String actorEmail;

    @Column(name = "action", nullable = false, length = 80, updatable = false)
    private String action;

    @Column(name = "target_type", length = 40, updatable = false)
    private String targetType;

    @Column(name = "target_id", length = 26, updatable = false)
    private String targetId;

    @Column(name = "before_state", columnDefinition = "text", updatable = false)
    private String beforeState;

    @Column(name = "after_state", columnDefinition = "text", updatable = false)
    private String afterState;

    @Column(name = "reason", length = 500, updatable = false)
    private String reason;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @Column(name = "user_agent", length = 255, updatable = false)
    private String userAgent;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.occurredAt = Instant.now();
    }
}
