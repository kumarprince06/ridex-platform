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

    /**
     * The stop sequences, copied from the route.
     *
     * <p>Denormalised so the database can compare intervals: the exclusion constraint that stops a
     * seat being sold twice over the same stretch needs numbers, not foreign keys. Stops are
     * append-only and never resequenced, so these cannot drift from the route they came off.
     */
    @Column(name = "boarding_seq", nullable = false, updatable = false)
    private short boardingSeq;

    @Column(name = "alighting_seq", nullable = false, updatable = false)
    private short alightingSeq;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "fare_minor", nullable = false, updatable = false)
    private long fareMinor;

    /** Set when a pass covered the seat instead of a payment. */
    @Column(name = "pass_id", length = 26)
    private String passId;

    /**
     * PAID, or PENDING while the rider is in checkout.
     *
     * <p>Separate from status on purpose: the seat is held from the moment it is picked, and the
     * constraints that stop it being sold twice are scoped to status = 'BOOKED'. An unpaid seat
     * parked in another status would be sold out from under somebody mid-payment.
     */
    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus = "PAID";

    /** When an unpaid hold is released. Null once it is paid for. */
    @Column(name = "hold_expires_at")
    private java.time.Instant holdExpiresAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "BOOKED";

    // Same idea as the on-demand pickup code: one secret, shown as digits and as a QR.
    @Column(name = "boarding_code_hash", length = 255)
    private String boardingCodeHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * When the driver checked this passenger in, null until then.
     *
     * <p>A timestamp rather than a status: the seat's unique index is scoped to status 'BOOKED',
     * so changing the status on boarding would free the seat somebody is sitting in.
     */
    @Column(name = "boarded_at")
    private Instant boardedAt;

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
