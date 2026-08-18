package com.ridex.infrastructure.maps;

public record GeoLocation(
        double latitude,
        double longitude,
        String formattedAddress) {
}
