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
    /** What the rider gave the driver. Null when only the driver has rated so far. */
    private Short stars;

    @Column(name = "comment", length = 500)
    private String comment;

    /** What the driver gave the rider. Null until they say - a trip can be rated one way only. */
    @Column(name = "rider_stars")
    private Short riderStars;

    @Column(name = "rider_comment", length = 500)
    private String riderComment;

    @Column(name = "rider_rated_at")
    private Instant riderRatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}
