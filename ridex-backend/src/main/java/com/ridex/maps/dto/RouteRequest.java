package com.ridex.maps.dto;

import jakarta.validation.constraints.NotNull;

public record RouteRequest(
        @NotNull Double pickupLat,
        @NotNull Double pickupLng,
        @NotNull Double destinationLat,
        @NotNull Double destinationLng) {
}
