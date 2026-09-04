package com.ridex.trip.dto;

import java.time.Instant;

import com.ridex.ride.domain.RideStatus;

public record TripResponse(
        String tripId,
        String rideId,
        RideStatus status,
        Instant arrivedAt,
        Instant startedAt,
        Instant completedAt,
        int waitingSeconds,
        String currency,
        Long finalFareMinor) {
}
