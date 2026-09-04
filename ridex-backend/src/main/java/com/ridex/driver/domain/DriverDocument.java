package com.ridex.driver.domain;

import java.time.Instant;

import com.ridex.auth.domain.User;
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

/**
 * A KYC document submitted by a driver. Only the storage key is held - the file itself lives in
 * object storage and access is brokered, never handed out as a public URL (docs/14).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "driver_documents")
public class DriverDocument {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "driver_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(name = "fk_driver_documents_driver")
    )
    private DriverProfile driver;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private DriverDocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DriverDocumentStatus status = DriverDocumentStatus.PENDING_REVIEW;

    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "reviewed_by",
        foreignKey = @ForeignKey(name = "fk_driver_documents_reviewer")
    )
    private User reviewedBy;

    @Column(name = "review_notes", length = 500)
    private String reviewNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * An approved licence that expired last month is not valid today. Eligibility checks must ask
     * this rather than reading {@code status} alone, which is only accurate as of its last review.
     */
    public boolean isValidAt(Instant when) {
        if (status != DriverDocumentStatus.APPROVED) {
            return false;
        }
        return expiresAt == null || expiresAt.isAfter(when);
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
