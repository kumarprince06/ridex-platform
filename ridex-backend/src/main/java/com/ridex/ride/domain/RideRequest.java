package com.ridex.ride.domain;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.pricing.domain.FareEstimate;
import com.ridex.pricing.domain.RideType;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ride_requests")
public class RideRequest {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rider_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_ride_requests_rider"))
    private RiderProfile rider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_type_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_ride_requests_ride_type"))
    private RideType rideType;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fare_estimate_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_ride_requests_estimate"))
    private FareEstimate fareEstimate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RideStatus status = RideStatus.REQUESTED;

    @Column(name = "pickup_lat", nullable = false, precision = 9, scale = 6)
    private BigDecimal pickupLat;

    @Column(name = "pickup_lng", nullable = false, precision = 9, scale = 6)
    private BigDecimal pickupLng;

    @Column(name = "pickup_address", length = 255)
    private String pickupAddress;

    @Column(name = "destination_lat", nullable = false, precision = 9, scale = 6)
    private BigDecimal destinationLat;

    @Column(name = "destination_lng", nullable = false, precision = 9, scale = 6)
    private BigDecimal destinationLng;

    @Column(name = "destination_address", length = 255)
    private String destinationAddress;

    /**
     * How the rider means to pay, chosen when they book.
     *
     * <p>Asked up front rather than at the end: the fare is only known when the trip finishes, and
     * a rider deciding then is a rider arguing with a driver on the kerb.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private com.ridex.payment.domain.PaymentMethod paymentMethod =
            com.ridex.payment.domain.PaymentMethod.CASH;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "quoted_fare_minor", nullable = false)
    private long quotedFareMinor;

    // What the rider chose to spend, and what it was worth when they chose it. The rate can move
    // between booking and completion, and they agreed to the number they were shown.
    @Column(name = "redeemed_points", nullable = false)
    private int redeemedPoints;

    @Column(name = "discount_minor", nullable = false)
    private long discountMinor;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by", length = 20)
    private CancelledBy cancelledBy;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    /** The code the rider picked. The free text beside it is their own wording. */
    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_reason_code", length = 40)
    private CancellationReason cancellationReasonCode;

    @Column(name = "cancellation_fee_minor")
    private Long cancellationFeeMinor;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    // How many waves the search has attempted. Recorded, not derived from the offers table: a
    // wave that finds nobody new writes no offer, and an inferred wave would never advance.
    @Column(name = "search_wave", nullable = false)
    private short searchWave;

    // Set when an offer is accepted. The cancellation grace window runs from here, not from the
    // request: nothing is spent on the rider's behalf until somebody is driving toward them.
    @Column(name = "assigned_driver_id", length = 26)
    private String assignedDriverId;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private Instant requestedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // A rider cancelling as dispatch assigns a driver must not both win.
    @Version
    @Column(name = "version", nullable = false)
    private long version;

    /** The only way the status moves. Validity is the machine's business, not each caller's. */
    public void transitionTo(RideStatus next) {
        this.status = this.status.require(next);
    }

    public void cancel(CancelledBy by, String reason, long feeMinor, Instant now) {
        transitionTo(switch (by) {
            case RIDER -> RideStatus.CANCELLED_BY_RIDER;
            case DRIVER -> RideStatus.CANCELLED_BY_DRIVER;
            case SYSTEM -> RideStatus.CANCELLED_BY_SYSTEM;
        });
        this.cancelledBy = by;
        this.cancellationReason = reason;
        this.cancellationFeeMinor = feeMinor;
        this.cancelledAt = now;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        Instant now = Instant.now();
        this.requestedAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
