package com.ridex.places.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A place worth naming: what to call it, and where it actually is. */
public record SavedPlaceRequest(
        @NotBlank(message = "Give this place a name")
        @Size(max = 60)
        String label,

        @NotBlank(message = "An address is required")
        @Size(max = 255)
        String address,

        @NotNull(message = "A latitude is required")
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0")
        Double latitude,

        @NotNull(message = "A longitude is required")
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
        Double longitude) {
}
