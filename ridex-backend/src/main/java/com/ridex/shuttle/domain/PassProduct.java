package com.ridex.shuttle.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A pass somebody can buy: a route, a duration, and a price. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "pass_products")
public class PassProduct {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_pass_products_route"))
    private Route route;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "duration_days", nullable = false)
    private short durationDays;

    // Zero is unlimited. A cap is what separates a commuter pass from a season ticket somebody
    // shares with three friends.
    @Column(name = "ride_limit", nullable = false)
    private short rideLimit;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "price_minor", nullable = false)
    private long priceMinor;

    @Column(name = "active", nullable = false)
    private boolean active = true;

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
