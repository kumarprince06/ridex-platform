package com.ridex.platform.settings;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "platform_settings")
public class PlatformSetting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 80, updatable = false)
    private String key;

    @Column(name = "setting_value", nullable = false, length = 255)
    private String value;

    @Column(name = "label", nullable = false, length = 120)
    private String label;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "value_type", nullable = false, length = 20)
    private String valueType;

    // Bounds, so a typo cannot set the referral reward to a million points.
    @Column(name = "min_value", precision = 14, scale = 4)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 14, scale = 4)
    private BigDecimal maxValue;

    @Column(name = "updated_by", length = 26)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = Instant.now();
    }
}
