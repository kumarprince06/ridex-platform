package com.ridex.rating;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Ids only, no @ManyToOne. Nothing here ever needs to walk to the rider or the driver, and the
// associations would only pull three more tables into every read.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ride_ratings")
public class RideRating {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "ride_id", nullable = false, length = 26, updatable = false)
    private String rideId;

    @Column(name = "rider_id", nullable = false, length = 26, updatable = false)
    private String riderId;

    @Column(name = "driver_id", nullable = false, length = 26, updatable = false)
    private String driverId;

    @Column(name = "stars", nullable = false)
    private short stars;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}
