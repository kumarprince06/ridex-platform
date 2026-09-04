package com.ridex.trip.domain;

import java.time.Instant;

import com.ridex.pricing.domain.FareLineType;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** The final fare, in the same shape as the estimate, so a receipt can put them side by side. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "trip_fare_lines")
public class TripFareLine {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_trip_fare_lines_trip"))
    private Trip trip;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_type", nullable = false, length = 30, updatable = false)
    private FareLineType lineType;

    @Column(name = "label", nullable = false, length = 80, updatable = false)
    private String label;

    @Column(name = "amount_minor", nullable = false, updatable = false)
    private long amountMinor;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "sort_order", nullable = false, updatable = false)
    private short sortOrder;

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
