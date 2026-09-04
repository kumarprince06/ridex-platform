package com.ridex.auth.domain;

import java.time.Instant;

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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Single-use, expiring, user-scoped token. Covers email verification and password reset, which
 * differ only in intent - hence one table with a purpose rather than two identical ones.
 *
 * <p>Only the hash is ever stored. The raw token exists in the outbound email and nowhere else, so
 * a leaked row cannot be redeemed.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "user_tokens",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "token_hash", name = "uk_user_tokens_token_hash")
    }
)
public class UserToken {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_user_tokens_user")
    )
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30, updatable = false)
    private TokenPurpose purpose;

    @Column(name = "token_hash", nullable = false, length = 255, updatable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    /** Stamped on redemption. Non-null means spent and unusable again. */
    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isRedeemable(Instant now) {
        return consumedAt == null && expiresAt.isAfter(now);
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
