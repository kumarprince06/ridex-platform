package com.ridex.entity;

import java.time.LocalDateTime;

import com.ridex.util.UlidGenerator;

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
    name = "tenant_business_profiles",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = "tenant_id",
            name = "uk_business_profile_tenant"),
        @UniqueConstraint(
            columnNames = "business_email",
            name = "uk_business_profile_business_email")
    }
)
public class TenantBusinessProfile {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "tenant_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_business_profile_tenant")
    )
    private Tenant tenant;

    @Column(name = "legal_business_name", nullable = false, length = 255)
    private String legalBusinessName;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "business_email", nullable = false, length = 255)
    private String businessEmail;

    @Column(name = "business_phone", length = 30)
    private String businessPhone;

    @Column(name = "country_code", nullable = false, length = 10)
    private String countryCode;

    @Column(name = "currency_code", nullable = false, length = 10)
    private String currencyCode;

    @Column(name = "timezone", nullable = false, length = 100)
    private String timezone;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "tax_identification_number", length = 100)
    private String taxIdentificationNumber;

    @Column(name = "website", length = 500)
    private String website;

    // Explicit names required: the default strategy maps addressLine1 -> address_line1, not address_line_1.
    @Column(name = "address_line_1", length = 255)
    private String addressLine1;

    @Column(name = "address_line_2", length = 255)
    private String addressLine2;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "postal_code", length = 30)
    private String postalCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
