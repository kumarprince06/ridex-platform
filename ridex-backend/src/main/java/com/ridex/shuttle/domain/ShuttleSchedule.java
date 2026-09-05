package com.ridex.shuttle.domain;

import java.time.Instant;
import java.time.LocalTime;

import com.ridex.shared.util.UlidGenerator;

import com.ridex.shuttle.SeatMap;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "shuttle_schedules")
public class ShuttleSchedule {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_shuttle_schedules_route"))
    private Route route;

    @Column(name = "departure_time", nullable = false)
    private LocalTime departureTime;

    /** ISO day numbers: "1,2,3,4,5" is Monday to Friday. */
    @Column(name = "days_of_week", nullable = false, length = 20)
    private String daysOfWeek = "1,2,3,4,5";

    @Column(name = "seat_capacity", nullable = false)
    private short seatCapacity;

    /**
     * How many seats abreast, so labels read A-D across. Four is a minibus; a 2+1 coach is 3, and
     * an auto rickshaw is 2.
     */
    @Column(name = "seats_per_row", nullable = false)
    private short seatsPerRow = SeatMap.DEFAULT_SEATS_PER_ROW;

    /**
     * The crew that normally runs this departure, copied onto every trip materialised from it.
     * A per-date swap is set on the trip instead.
     */
    @Column(name = "driver_id", length = 26)
    private String driverId;

    @Column(name = "vehicle_id", length = 26)
    private String vehicleId;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean runsOn(java.time.DayOfWeek day) {
        return daysOfWeek.contains(String.valueOf(day.getValue()));
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
