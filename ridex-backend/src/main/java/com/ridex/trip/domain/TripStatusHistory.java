package com.ridex.trip.domain;

import java.time.Instant;

import com.ridex.ride.domain.RideStatus;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only. What a status column cannot say: when it changed, and who changed it. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "trip_status_history")
public class TripStatusHistory {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "trip_id", nullable = false, length = 26, updatable = false)
    private String tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30, updatable = false)
    private RideStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 30, updatable = false)
    private RideStatus toStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20, updatable = false)
    private ActorType actorType;

    @Column(name = "actor_id", length = 26, updatable = false)
    private String actorId;

    @Column(name = "reason", length = 500, updatable = false)
    private String reason;

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
