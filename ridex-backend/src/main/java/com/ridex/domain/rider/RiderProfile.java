package com.ridex.domain.rider;

import java.time.Instant;

import com.ridex.domain.user.User;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Rider-side data for an account. Deliberately thin - the name lives on {@link User} because the
 * same person may also hold a driver profile and has only one name.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "rider_profiles",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "user_id", name = "uk_rider_profiles_user")
    }
)
public class RiderProfile {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_rider_profiles_user")
    )
    private User user;

    /** Object storage key, not a URL. The application brokers access to it. */
    @Column(name = "profile_image_key", length = 255)
    private String profileImageKey;

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
