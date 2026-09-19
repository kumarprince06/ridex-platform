package com.ridex.legal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLegalDocumentRequest(
        @NotBlank(message = "A title is required")
        @Size(max = 120)
        String title,

        // Generous but bounded: a pasted document, not an upload channel.
        @NotBlank(message = "The document cannot be empty")
        @Size(max = 100_000)
        String body) {
}
