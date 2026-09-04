package com.ridex.driver.domain;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.auth.domain.User;
import com.ridex.shared.exception.ConflictException;
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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "driver_profiles",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "user_id", name = "uk_driver_profiles_user")
    }
)
public class DriverProfile {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_driver_profiles_user")
    )
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "onboarding_status", nullable = false, length = 30)
    private DriverOnboardingStatus onboardingStatus = DriverOnboardingStatus.REGISTERED;

    /** Null until the driver has been rated at all, which is not a rating of zero. */
    @Column(name = "rating", precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;

    // Whether the driver is accepting work. Redis holds the live position, which changes every
    // few seconds; duty is a decision that must survive a Redis restart.
    @Column(name = "on_duty", nullable = false)
    private boolean onDuty;

    @Column(name = "duty_changed_at")
    private Instant dutyChangedAt;

    @Column(name = "profile_image_key", length = 255)
    private String profileImageKey;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "reviewed_by",
        foreignKey = @ForeignKey(name = "fk_driver_profiles_reviewer")
    )
    private User reviewedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * The single place onboarding state changes. Routing every move through here is what
     * docs/11 means by validating the machine in one boundary.
     */
    public void transitionTo(DriverOnboardingStatus next) {
        if (!onboardingStatus.canTransitionTo(next)) {
            throw new ConflictException(
                    "Cannot move driver onboarding from " + onboardingStatus + " to " + next);
        }
        this.onboardingStatus = next;
    }

    public boolean isEligibleToDrive() {
        return onboardingStatus.isEligibleToDrive();
    }

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
