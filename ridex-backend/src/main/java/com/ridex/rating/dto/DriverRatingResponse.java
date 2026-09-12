package com.ridex.rating.dto;

import java.time.Instant;

/** What one rider said about a driver, for the driver's own ratings screen. */
public record DriverRatingResponse(
        String rideId,
        Short stars,
        String comment,
        Instant createdAt) {
}
