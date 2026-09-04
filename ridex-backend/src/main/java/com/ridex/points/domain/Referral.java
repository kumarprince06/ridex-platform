package com.ridex.points.domain;

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
@Table(name = "referrals")
public class Referral {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "referrer_user_id", nullable = false, length = 26, updatable = false)
    private String referrerUserId;

    @Column(name = "referee_user_id", nullable = false, length = 26, updatable = false)
    private String refereeUserId;

    @Column(name = "code", nullable = false, length = 12, updatable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReferralStatus status = ReferralStatus.PENDING;

    @Column(name = "qualified_at")
    private Instant qualifiedAt;

    // POINTS for a rider referrer, CASH for a driver. Decided by who refers, not who is referred.
    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type", nullable = false, length = 10)
    private ReferralRewardType rewardType = ReferralRewardType.POINTS;

    /** Completed trips the referred driver has done so far. Counted, never inferred. */
    @Column(name = "qualifying_trips", nullable = false)
    private int qualifyingTrips;

    /** Nothing pays after this. A dormant account must not qualify a year later. */
    @Column(name = "qualify_by")
    private Instant qualifyBy;

    @Column(name = "void_reason", length = 255)
    private String voidReason;

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
