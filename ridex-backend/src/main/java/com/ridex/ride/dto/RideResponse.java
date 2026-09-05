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
        // The map on the trip screen draws these. Without them a client can only guess a route,
        // and a guessed route is a line the trip never followed.
        double pickupLat,
        double pickupLng,
        double destinationLat,
        double destinationLng,
        String currency,
        long quotedFareMinor,
        // Carried on the ride, not left behind with the estimate: "why am I paying this" is asked
        // about the ride, not about a quote the rider has forgotten.
        List<FareLineResponse> fareLines,
        int redeemedPoints,
        long discountMinor,
        Long cancellationFeeMinor,
        String cancellationReason,
        /**
         * The digits the rider shows the driver, and the QR that encodes them. Present only while
         * the ride is live and only to the rider it belongs to.
         */
        String pickupCode,
        Instant requestedAt) {
}
