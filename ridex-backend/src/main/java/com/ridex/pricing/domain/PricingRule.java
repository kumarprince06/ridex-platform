package com.ridex.pricing.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Currency;

import com.ridex.shared.money.Money;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A row of rates. {@link FareRates} is the value the calculator works with. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "pricing_rules")
public class PricingRule {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_type_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_pricing_rules_ride_type"))
    private RideType rideType;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "base_fare_minor", nullable = false)
    private long baseFareMinor;

    @Column(name = "per_km_minor", nullable = false)
    private long perKmMinor;

    @Column(name = "per_minute_minor", nullable = false)
    private long perMinuteMinor;

    @Column(name = "minimum_fare_minor", nullable = false)
    private long minimumFareMinor;

    @Column(name = "free_waiting_seconds", nullable = false)
    private int freeWaitingSeconds;

    @Column(name = "per_waiting_minute_minor", nullable = false)
    private long perWaitingMinuteMinor;

    @Column(name = "surge_multiplier", nullable = false, precision = 4, scale = 2)
    private BigDecimal surgeMultiplier = BigDecimal.ONE;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_to")
    private Instant validTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** The shape the calculator takes, so no caller reads raw columns and does the maths itself. */
    public FareRates toRates() {
        Currency unit = Currency.getInstance(currency);
        return new FareRates(
                unit,
                Money.of(baseFareMinor, unit),
                Money.of(perKmMinor, unit),
                Money.of(perMinuteMinor, unit),
                Money.of(minimumFareMinor, unit),
                freeWaitingSeconds,
                Money.of(perWaitingMinuteMinor, unit),
                surgeMultiplier);
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
        if (validFrom == null) {
            this.validFrom = this.createdAt;
        }
    }
}
