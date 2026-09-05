package com.ridex.driver.dto;

import java.time.Instant;

import com.ridex.driver.domain.DriverDocument;
import com.ridex.driver.domain.DriverDocumentStatus;
import com.ridex.driver.domain.DriverDocumentType;

/** No storage key: a client never needs it, and it is the one field that locates the KYC file. */
public record DriverDocumentResponse(
        String id,
        DriverDocumentType documentType,
        DriverDocumentStatus status,
        Instant expiresAt,
        Instant reviewedAt,
        String reviewNotes,
        Instant createdAt) {

    public static DriverDocumentResponse of(DriverDocument document) {
        return new DriverDocumentResponse(
                document.getId(),
                document.getDocumentType(),
                document.getStatus(),
                document.getExpiresAt(),
                document.getReviewedAt(),
                document.getReviewNotes(),
                document.getCreatedAt());
    }
}
