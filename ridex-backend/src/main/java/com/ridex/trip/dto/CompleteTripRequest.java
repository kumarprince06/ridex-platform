package com.ridex.trip.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// Distance is reported by the driver's app because only it was there. It is not trusted blindly:
// the server bounds it against the quoted route before it prices anything.
public record CompleteTripRequest(
        @NotNull @Min(0) Integer distanceMeters,
        @NotNull @Min(0) Integer durationSeconds) {
}
