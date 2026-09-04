package com.ridex.ride.domain;

import java.time.Instant;
import java.util.Currency;

import com.ridex.shared.money.Money;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** What cancelling costs, given who cancelled and from which state. Data, not if-statements. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cancellation_policies")
public class CancellationPolicy {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by", nullable = false, length = 20)
    private CancelledBy cancelledBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 30)
    private RideStatus fromStatus;

    @Column(name = "grace_seconds", nullable = false)
    private int graceSeconds;

    @Column(name = "fee_minor", nullable = false)
    private long feeMinor;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * The fee for cancelling now.
     *
     * <p>The grace window runs from when a driver was assigned, not from when the ride was
     * requested: nothing has been spent on the rider's behalf until somebody is driving toward
     * them. With no assignment there is nothing to charge for.
     */
    public Money feeFor(Instant assignedAt, Instant now) {
        Currency unit = Currency.getInstance(currency);
        if (assignedAt == null) {
            return Money.zero(unit);
        }
        boolean withinGrace = assignedAt.plusSeconds(graceSeconds).isAfter(now);
        return withinGrace ? Money.zero(unit) : Money.of(feeMinor, unit);
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
