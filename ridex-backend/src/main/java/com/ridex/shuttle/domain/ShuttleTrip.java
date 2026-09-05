package com.ridex.shuttle.domain;

import java.time.Instant;
import java.time.LocalDate;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One departure on one date. Created when somebody first books it, not ahead for every day. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "shuttle_trips")
public class ShuttleTrip {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_shuttle_trips_schedule"))
    private ShuttleSchedule schedule;

    @Column(name = "service_date", nullable = false)
    private LocalDate serviceDate;

    @Column(name = "departs_at", nullable = false)
    private Instant departsAt;

    @Column(name = "driver_id", length = 26)
    private String driverId;

    @Column(name = "vehicle_id", length = 26)
    private String vehicleId;

    @Column(name = "seat_capacity", nullable = false)
    private short seatCapacity;

    // Frozen with the departure. Changing the layout after a seat is sold would move somebody who
    // already paid for 3C.
    @Column(name = "seats_per_row", nullable = false)
    private short seatsPerRow = 4;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "SCHEDULED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
