package com.ridex.payment.domain;

import java.time.Instant;

import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.util.UlidGenerator;
import com.ridex.trip.domain.Trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_payments_trip"))
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rider_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_payments_rider"))
    private RiderProfile rider;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false, length = 20)
    private PaymentMethod method;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PaymentStatus status = PaymentStatus.CREATED;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    /** The fare before anything is taken off. What the driver is paid on. */
    @Column(name = "gross_amount_minor", nullable = false)
    private long grossAmountMinor;

    /** Points and promotions. Funded by the platform, never by the driver. */
    @Column(name = "discount_amount_minor", nullable = false)
    private long discountAmountMinor;

    /** What the rider actually pays. */
    @Column(name = "net_amount_minor", nullable = false)
    private long netAmountMinor;

    @Column(name = "provider_payment_id", length = 120)
    private String providerPaymentId;

    @Column(name = "idempotency_key", nullable = false, length = 120, updatable = false)
    private String idempotencyKey;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
