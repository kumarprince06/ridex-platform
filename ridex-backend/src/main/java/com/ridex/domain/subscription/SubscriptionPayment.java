package com.ridex.domain.subscription;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.domain.tenant.Tenant;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "subscription_payments")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionPayment {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "tenant_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_subscription_payments_tenant")
    )
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "subscription_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_subscription_payments_subscription")
    )
    private TenantSubscription subscription;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 10)
    private String currencyCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private SubscriptionPaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_provider", length = 50)
    private PaymentProviderType paymentProvider;

    @Column(name = "provider_payment_id", length = 255)
    private String providerPaymentId;

    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "initiated_at", nullable = false, updatable = false)
    private Instant initiatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "failure_code", length = 100)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }

        Instant now = Instant.now();
        if (initiatedAt == null) {
            initiatedAt = now;
        }
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
