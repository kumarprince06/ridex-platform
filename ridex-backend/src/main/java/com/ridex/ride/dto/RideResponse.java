package com.ridex.ride.dto;

import java.time.Instant;
import java.util.List;

import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.domain.RideStatus;

public record RideResponse(
        String id,
        RideStatus status,
        String rideTypeCode,
        String pickupAddress,
        String destinationAddress,
        String currency,
        long quotedFareMinor,
        // Carried on the ride, not left behind with the estimate: "why am I paying this" is asked
        // about the ride, not about a quote the rider has forgotten.
        List<FareLineResponse> fareLines,
        Long cancellationFeeMinor,
        String cancellationReason,
        Instant requestedAt) {
}
