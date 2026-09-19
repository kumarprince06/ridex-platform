package com.ridex.legal.dto;

import java.time.Instant;

import com.ridex.legal.LegalDocument;

public record LegalDocumentResponse(String slug, String title, String body, Instant updatedAt) {

    public static LegalDocumentResponse of(LegalDocument document) {
        return new LegalDocumentResponse(document.getSlug(), document.getTitle(), document.getBody(),
                document.getUpdatedAt());
    }
}
