package com.ridex.maps.domain;

public record GeoLocation(
        double latitude,
        double longitude,
        String formattedAddress) {
}
