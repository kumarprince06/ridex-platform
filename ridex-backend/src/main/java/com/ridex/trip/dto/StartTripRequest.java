package com.ridex.trip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// The same six digits whether the driver scanned the rider's QR or typed them. One secret, two
// ways to present it - the client says which it used, not which credential it holds.
public record StartTripRequest(
        @NotBlank(message = "Pickup code is required")
        @Pattern(regexp = "\\d{6}", message = "Pickup code must be 6 digits")
        String pickupCode) {
}
