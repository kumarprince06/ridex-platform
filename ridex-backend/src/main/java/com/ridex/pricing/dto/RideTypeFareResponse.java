package com.ridex.pricing.dto;

import java.time.Instant;

/** A ride type and the fare in force for it now. The rule fields are null when none is set. */
public record RideTypeFareResponse(
        String rideTypeId,
        String code,
        String displayName,
        int seatCapacity,
        boolean active,
        String currency,
        Long baseFareMinor,
        Long perKmMinor,
        Long perMinuteMinor,
        Long minimumFareMinor,
        Integer freeWaitingSeconds,
        Long perWaitingMinuteMinor,
        Instant validFrom) {
}
