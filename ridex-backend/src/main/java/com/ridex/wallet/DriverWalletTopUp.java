package com.ridex.wallet;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "driver_wallet_topups")
public class DriverWalletTopUp {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "driver_id", nullable = false, length = 26, updatable = false)
    private String driverId;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "amount_minor", nullable = false)
    private long amountMinor;

    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_order_id", nullable = false, length = 100)
    private String providerOrderId;

    // The client's key for this checkout; a repeat of it returns this row, not a second order.
    @Column(name = "idempotency_key", length = 100, updatable = false)
    private String idempotencyKey;

    @Column(name = "provider_payment_id", length = 100)
    private String providerPaymentId;

    // CREATED until the gateway confirms: SUCCEEDED, FAILED, or PROCESSING while it decides.
    @Column(name = "status", nullable = false, length = 20)
    private String status = "CREATED";

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        createdAt = Instant.now();
    }
}
