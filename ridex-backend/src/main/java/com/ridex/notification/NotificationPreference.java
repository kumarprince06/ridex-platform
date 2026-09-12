package com.ridex.notification;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * What one person wants to be told about.
 *
 * <p>Defaults to everything on: somebody who has never opened settings still needs to know their
 * driver arrived. A row exists only once they have changed something.
 */
@Getter
@Setter
@Entity
@Table(name = "notification_preferences")
public class NotificationPreference {

    @Id
    @Column(name = "user_id", nullable = false, length = 26, updatable = false)
    private String userId;

    @Column(name = "push", nullable = false)
    private boolean push = true;

    @Column(name = "email", nullable = false)
    private boolean email = true;

    @Column(name = "promotions", nullable = false)
    private boolean promotions = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
