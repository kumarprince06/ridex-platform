package com.ridex.pricing.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** A new fare for a ride type, in paise. Takes effect for every estimate from now on. */
public record RideTypeFareRequest(
        @Min(value = 0, message = "A base fare cannot be negative") long baseFareMinor,
        @Min(value = 0, message = "A per-km rate cannot be negative") long perKmMinor,
        @Min(value = 0, message = "A per-minute rate cannot be negative") long perMinuteMinor,
        @Min(value = 0, message = "A minimum fare cannot be negative") long minimumFareMinor,
        @Min(value = 0, message = "Free waiting cannot be negative")
        @Max(value = 1800, message = "Free waiting is at most 30 minutes") int freeWaitingSeconds,
        @Min(value = 0, message = "A waiting rate cannot be negative") long perWaitingMinuteMinor) {
}
