package com.ridex.trip.dto;

import java.time.Instant;

import com.ridex.ride.domain.RideStatus;

/**
 * One line in the driver's trip history.
 *
 * <p>What they earned, not what the rider paid: the two differ by the platform's commission, and
 * a driver reading the fare as their own is a support ticket every week.
 */
public record DriverTripSummary(
        String tripId,
        String rideId,
        RideStatus status,
        String riderName,
        String pickupAddress,
        String destinationAddress,
        String currency,
        Long fareMinor,
        Long earnedMinor,
        Integer distanceMeters,
        Instant completedAt,
        /** What the rider gave, once they have. Null while it is still unrated. */
        Short riderRating) {
}
