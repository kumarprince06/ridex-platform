package com.ridex.maps.domain;

public record RouteEstimate(
        double distanceMeters,
        long durationSeconds,
        String distanceText,
        String durationText) {
}
