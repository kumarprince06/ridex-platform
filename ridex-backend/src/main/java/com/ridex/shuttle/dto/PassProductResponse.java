package com.ridex.shuttle.dto;

public record PassProductResponse(
        String id, String name, String description,
        int durationDays, int rideLimit, String currency, long priceMinor) {
}
