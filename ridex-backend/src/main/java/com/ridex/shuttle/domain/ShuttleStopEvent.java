package com.ridex.shuttle.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A stop a running shuttle has reached. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "shuttle_stop_events")
public class ShuttleStopEvent {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "shuttle_trip_id", nullable = false, length = 26, updatable = false)
    private String shuttleTripId;

    @Column(name = "stop_id", nullable = false, length = 26, updatable = false)
    private String stopId;

    @Column(name = "sequence", nullable = false, updatable = false)
    private short sequence;

    @Column(name = "arrived_at", nullable = false, updatable = false)
    private Instant arrivedAt;

    @Column(name = "source", nullable = false, length = 10, updatable = false)
    private String source;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}
