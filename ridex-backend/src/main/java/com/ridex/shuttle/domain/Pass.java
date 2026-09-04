package com.ridex.shuttle.domain;

import java.time.Instant;
import java.time.LocalDate;

import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A rider's live pass.
 *
 * <p>An entitlement, not a wallet balance: it covers a seat on its route within its dates, or it
 * does not. Nothing here can be spent anywhere else, which is what keeps it out of the money
 * ledger entirely.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "passes")
public class Pass {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_passes_product"))
    private PassProduct product;

    // Bound to the account, so a pass cannot be handed round an office.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rider_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_passes_rider"))
    private RiderProfile rider;

    @Column(name = "route_id", nullable = false, length = 26, updatable = false)
    private String routeId;

    @Column(name = "starts_on", nullable = false)
    private LocalDate startsOn;

    @Column(name = "ends_on", nullable = false)
    private LocalDate endsOn;

    @Column(name = "ride_limit", nullable = false)
    private short rideLimit;

    // Counted up, not down: a used count reconciles against the bookings, a remaining count cannot.
    @Column(name = "rides_used", nullable = false)
    private short ridesUsed;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "price_paid_minor", nullable = false)
    private long pricePaidMinor;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Live for this date, on this route, with rides left. */
    public boolean coversOn(LocalDate date, String route) {
        return "ACTIVE".equals(status)
                && routeId.equals(route)
                && !date.isBefore(startsOn)
                && !date.isAfter(endsOn)
                && (rideLimit == 0 || ridesUsed < rideLimit);
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
