package com.ridex.notification;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * One line in a person's notification feed.
 *
 * <p>The words are stored rather than re-rendered on read: a template edited next month must not
 * silently rewrite what somebody was told last week.
 */
@Getter
@Setter
@Entity
@Table(name = "user_notifications")
public class UserNotification {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, length = 26)
    private String userId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", nullable = false)
    private String body;

    /** What it is about, so a tap can open it. Null for news with nowhere to go. */
    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id", length = 26)
    private String referenceId;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        createdAt = Instant.now();
    }
}
