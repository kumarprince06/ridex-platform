package com.ridex.trip.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.ridex.driver.domain.DriverProfile;
import com.ridex.ride.domain.RideRequest;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * What actually happened, as opposed to what was requested.
 *
 * <p>Deliberately has no status of its own: the ride request already holds the machine, and a
 * second status column is a second source of truth that will disagree with the first.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "trips")
public class Trip {

    public static final short MAX_PICKUP_CODE_ATTEMPTS = 5;

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_request_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_trips_ride_request"))
    private RideRequest rideRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_trips_driver"))
    private DriverProfile driver;

    // BCrypt, like every other short code: lookup is by trip, so the digest never has to be
    // deterministic, and a SHA-256 of six digits is a million-row rainbow table.
    @Column(name = "pickup_code_hash", nullable = false, length = 255)
    private String pickupCodeHash;

    @Column(name = "pickup_code_attempts", nullable = false)
    private short pickupCodeAttempts;

    @Column(name = "arrived_at")
    private Instant arrivedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "waiting_seconds", nullable = false)
    private int waitingSeconds;

    @Column(name = "actual_distance_meters")
    private Integer actualDistanceMeters;

    @Column(name = "actual_duration_seconds")
    private Integer actualDurationSeconds;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "final_fare_minor")
    private Long finalFareMinor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // A rider cancelling as the driver taps Start must not both win.
    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<TripFareLine> fareLines = new ArrayList<>();

    public void addFareLine(TripFareLine line) {
        line.setTrip(this);
        fareLines.add(line);
    }

    /** Every guess counts, right or wrong, or the cap counts nothing. */
    public void recordPickupCodeAttempt() {
        this.pickupCodeAttempts++;
    }

    public boolean pickupCodeIsBurned() {
        return pickupCodeAttempts >= MAX_PICKUP_CODE_ATTEMPTS;
    }

    /**
     * Seconds waited at pickup, from the driver's recorded arrival.
     *
     * <p>Server timestamps only: a phone deciding when it arrived is a phone deciding the fare.
     */
    public int waitedSecondsAt(Instant now) {
        if (arrivedAt == null) {
            return 0;
        }
        Instant until = startedAt == null ? now : startedAt;
        return (int) Math.max(0, until.getEpochSecond() - arrivedAt.getEpochSecond());
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
