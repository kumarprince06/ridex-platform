package com.ridex.domain.user;

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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Only the hash of a verification token is ever stored. The raw token exists in the outbound email
 * and nowhere else, so a leaked row cannot be used to verify an account.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "email_verification_tokens",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = "token_hash",
            name = "uk_email_verification_token")
    }
)
public class EmailVerificationToken {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_email_verification_user")
    )
    private User user;

    @Column(name = "token_hash", nullable = false, length = 255, updatable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    /** Stamped when the token is redeemed. Non-null means it is spent and cannot be reused. */
    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // No updated_at column on this table, so there is no @PreUpdate.
    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }

}
