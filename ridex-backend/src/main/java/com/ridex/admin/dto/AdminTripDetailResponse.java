package com.ridex.admin.dto;

import java.time.Instant;
import java.util.List;

import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.domain.RideStatus;
import com.ridex.trip.domain.ActorType;

/**
 * One ride, with how it got to where it is and what it was charged.
 *
 * <p>Quote and charge side by side because "why is this different from the estimate" is the
 * question every trip ticket is actually about.
 */
public record AdminTripDetailResponse(
        AdminTripResponse trip,
        String tripId,
        Integer quotedDistanceMeters,
        Integer actualDistanceMeters,
        Integer actualDurationSeconds,
        int waitingSeconds,
        String cancellationReason,
        List<FareLineResponse> quotedLines,
        List<FareLineResponse> chargedLines,
        List<Transition> timeline) {

    public record Transition(
            RideStatus fromStatus,
            RideStatus toStatus,
            ActorType actorType,
            String actorId,
            String reason,
            Instant occurredAt) {
    }
}
