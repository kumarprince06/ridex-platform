package com.ridex.pricing.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

// No ride type and no fare: the server prices every option it offers, and a client that could name
// a price would be naming its own.
public record EstimateRequest(
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double pickupLat,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double pickupLng,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double destinationLat,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double destinationLng) {
}
