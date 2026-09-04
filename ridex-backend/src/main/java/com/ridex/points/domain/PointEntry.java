package com.ridex.points.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One movement of points. Append-only: a correction is another entry, never an edit.
 *
 * <p>No currency, deliberately. A point is not money - it is a promise redeemable at a rate the
 * platform sets, and giving it a currency is the first step to owing somebody a withdrawal.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "point_entries")
public class PointEntry {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, length = 26, updatable = false)
    private String userId;

    /** Signed: earning positive, spending negative. A balance is the sum, never a stored field. */
    @Column(name = "points", nullable = false, updatable = false)
    private int points;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 40, updatable = false)
    private PointReason reason;

    @Column(name = "reference_type", length = 30, updatable = false)
    private String referenceType;

    @Column(name = "reference_id", length = 26, updatable = false)
    private String referenceId;

    // Unique. Awarding the same referral twice is refused by the database, not by remembering to
    // check first.
    @Column(name = "idempotency_key", nullable = false, length = 120, updatable = false)
    private String idempotencyKey;

    @Column(name = "note", length = 255, updatable = false)
    private String note;

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
