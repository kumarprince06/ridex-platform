package com.ridex.shuttle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The six digits the passenger shows, or the same value scanned out of their QR. */
public record BoardPassengerRequest(
        @NotBlank(message = "The boarding code is required")
        @Pattern(regexp = "\\d{6}", message = "A boarding code is six digits")
        String boardingCode) {
}
