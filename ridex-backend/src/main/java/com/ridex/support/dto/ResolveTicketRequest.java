package com.ridex.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Resolving needs an explanation the person raising it will actually read. */
public record ResolveTicketRequest(
        @NotBlank(message = "Say how this was resolved")
        @Size(min = 12, max = 1000, message = "Give a resolution of at least 12 characters")
        String resolution) {
}
