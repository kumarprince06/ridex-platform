package com.ridex.infrastructure.maps;

public record RouteEstimate(
        double distanceMeters,
        long durationSeconds,
        String distanceText,
        String durationText) {
}
