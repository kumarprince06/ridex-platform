package com.ridex.auth.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "refresh_tokens",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "token_hash", name = "uk_refresh_tokens_token_hash")
    }
)
public class RefreshToken {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_refresh_tokens_user")
    )
    private User user;

    // Not updatable = false: refresh rotates the hash in place rather than issuing a new row, so
    // one row stays one device session for its whole life.
    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    // The secret before the last rotation, so a replay of it reads as theft rather than as an
    // ordinary unknown token.
    @Column(name = "previous_token_hash", length = 255)
    private String previousTokenHash;

    /**
     * Device fingerprint, captured at login. A live row is a live session, so this is what
     * FR-AUTH-007 lists and revokes - a separate user_sessions table would hold the same rows.
     */
    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // One place, so no caller can replace the secret without keeping the generation it replaced.
    public void rotateTo(String newTokenHash, Instant now, Instant newExpiry) {
        this.previousTokenHash = this.tokenHash;
        this.tokenHash = newTokenHash;
        this.expiresAt = newExpiry;
        this.lastUsedAt = now;
    }

    public boolean isLiveAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
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
