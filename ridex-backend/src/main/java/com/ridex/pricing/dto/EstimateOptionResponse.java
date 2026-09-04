package com.ridex.pricing.dto;

import java.time.Instant;
import java.util.List;

/** One priced option. The client shows the lines; it never re-derives the total from them. */
public record EstimateOptionResponse(
        String estimateId,
        String rideTypeCode,
        String displayName,
        String description,
        int seatCapacity,
        int distanceMeters,
        int durationSeconds,
        String currency,
        long totalMinor,
        List<FareLineResponse> lines,
        Instant expiresAt) {
}
