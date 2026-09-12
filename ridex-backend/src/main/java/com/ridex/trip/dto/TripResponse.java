package com.ridex.trip.dto;

import java.time.Instant;

import com.ridex.ride.domain.RideStatus;

/**
 * The trip as the driver's app shows it.
 *
 * <p>Carries the rider and the two addresses because the partner app has nowhere else to get them:
 * the offer it accepted is gone by the time the trip screens open, and a driver reading a name the
 * phone invented is a driver greeting the wrong passenger.
 */
public record TripResponse(
        String tripId,
        String rideId,
        RideStatus status,
        String riderName,
        String pickupAddress,
        String destinationAddress,
        Instant arrivedAt,
        Instant startedAt,
        Instant completedAt,
        int waitingSeconds,
        String currency,
        /** What the rider was quoted. The final fare is null until the trip ends. */
        long quotedFareMinor,
        /** CASH or ONLINE - whether the driver collects at the door. */
        String paymentMethod,
        Long finalFareMinor) {
}
