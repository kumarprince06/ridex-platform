package com.ridex.shuttle.domain;

import java.time.Instant;

import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A booked seat.
 *
 * <p>The seat label is half of a unique index, which is what actually stops two people being sold
 * 4A. A counter would let it happen under load, and nobody finds out until two riders are standing
 * at the same door.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "shuttle_bookings")
public class ShuttleBooking {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shuttle_trip_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_shuttle_bookings_trip"))
    private ShuttleTrip shuttleTrip;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rider_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_shuttle_bookings_rider"))
    private RiderProfile rider;

    @Column(name = "seat_label", nullable = false, length = 6, updatable = false)
    private String seatLabel;

    @Column(name = "boarding_stop_id", nullable = false, length = 26, updatable = false)
    private String boardingStopId;

    @Column(name = "alighting_stop_id", nullable = false, length = 26, updatable = false)
    private String alightingStopId;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "fare_minor", nullable = false, updatable = false)
    private long fareMinor;

    /** Set when a pass covered the seat instead of a payment. */
    @Column(name = "pass_id", length = 26)
    private String passId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "BOOKED";

    // Same idea as the on-demand pickup code: one secret, shown as digits and as a QR.
    @Column(name = "boarding_code_hash", length = 255)
    private String boardingCodeHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
