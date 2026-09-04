package com.ridex.pricing.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One component of a quoted fare. Append-only: a correction is another line, never an edit. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "fare_estimate_lines")
public class FareEstimateLine {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fare_estimate_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_fare_estimate_lines_estimate"))
    private FareEstimate estimate;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_type", nullable = false, length = 30, updatable = false)
    private FareLineType lineType;

    @Column(name = "label", nullable = false, length = 80, updatable = false)
    private String label;

    // Signed: a discount is a negative line, not a positive one the reader must know to subtract.
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
