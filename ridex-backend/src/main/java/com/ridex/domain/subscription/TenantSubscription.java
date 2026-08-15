package com.ridex.domain.subscription;

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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "tenant_subscriptions",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenant_id", "subscription_plan_id"}, name = "uk_tenant_subscriptions_tenant_plan")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class TenantSubscription {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "tenant_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_tenant_subscriptions_tenant")
    )
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "subscription_plan_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_tenant_subscriptions_plan")
    )
    private SubscriptionPlan subscriptionPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private TenantSubscriptionStatus status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "current_period_start")
    private Instant currentPeriodStart;

    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;

    @Column(name = "trial_start_at")
    private Instant trialStartAt;

    @Column(name = "trial_end_at")
    private Instant trialEndAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

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
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
