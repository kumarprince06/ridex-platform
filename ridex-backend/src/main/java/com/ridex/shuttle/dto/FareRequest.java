package com.ridex.shuttle.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FareRequest(
        @NotBlank(message = "The origin stop is required")
        String fromStopId,

        @NotBlank(message = "The destination stop is required")
        String toStopId,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter code")
        String currency,

        // Zero is allowed: a free shuttle leg is a real thing on a corporate route.
        @Min(value = 0, message = "A fare cannot be negative")
        long fareMinor) {
}
