package com.ridex.dispatch.dto;

import java.time.Instant;

/** What a driver is shown. The fare is the platform's number, never something the phone computes. */
public record OfferResponse(
        String offerId,
        String rideId,
        String pickupAddress,
        String destinationAddress,
        double pickupLat,
        double pickupLng,
        int tripDistanceMeters,
        Integer distanceToPickupMeters,
        String currency,
        long quotedFareMinor,
        // Server-issued. A countdown the phone computed could be waited out by a paused app.
        Instant expiresAt) {
}
