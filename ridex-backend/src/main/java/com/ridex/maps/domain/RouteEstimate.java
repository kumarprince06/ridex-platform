package com.ridex.maps.domain;

public record RouteEstimate(
        double distanceMeters,
        long durationSeconds,
        String distanceText,
        String durationText,
        /**
         * How long the same road takes with current traffic, or null when the provider does not
         * know. Only Google answers this, and only when asked for a departure time - the free
         * routers model an empty road and would report congestion that is always light.
         */
        Long durationInTrafficSeconds) {
}
