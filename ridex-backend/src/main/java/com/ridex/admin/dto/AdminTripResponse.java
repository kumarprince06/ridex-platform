package com.ridex.admin.dto;

import java.time.Instant;

import com.ridex.ride.domain.RideStatus;

public record AdminTripResponse(
        String rideId,
        RideStatus status,
        String rideTypeCode,
        String riderEmail,
        String driverEmail,
        String pickupAddress,
        String destinationAddress,
        String currency,
        long quotedFareMinor,
        Long finalFareMinor,
        Instant requestedAt) {
}
