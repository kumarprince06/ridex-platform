package com.ridex.payment.domain;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.driver.domain.DriverProfile;
import com.ridex.shared.util.UlidGenerator;
import com.ridex.trip.domain.Trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * What one trip earned a driver, and what the platform took.
 *
 * <p>Explicit lines rather than a net figure: a driver must be able to reconstruct their payout
 * from their trips, and that is the whole of differentiator #2 in docs/27.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "driver_earnings")
public class DriverEarning {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_driver_earnings_driver"))
    private DriverProfile driver;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_driver_earnings_trip"))
    private Trip trip;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    /** The full fare. Never the discounted amount: a rider's points are not the driver's problem. */
    @Column(name = "gross_amount_minor", nullable = false, updatable = false)
    private long grossAmountMinor;

    // Stored, not looked up: changing the rate later must not rewrite what somebody was already paid.
    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4, updatable = false)
    private BigDecimal commissionRate;

    @Column(name = "commission_minor", nullable = false, updatable = false)
    private long commissionMinor;

    @Column(name = "net_amount_minor", nullable = false, updatable = false)
    private long netAmountMinor;

    /**
     * The payout that settled this line, null while it is still owed.
     *
     * <p>The id rather than the entity: a batch reads thousands of these and never needs to walk
     * back to the payout it is in the middle of creating.
     */
    @Column(name = "payout_id", length = 26)
    private String payoutId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
