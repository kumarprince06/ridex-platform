package com.ridex.shuttle.dto;

import java.time.Instant;
import java.util.List;

/**
 * Everything the tracking screens show for one departure. Sent whole on every update, so a
 * client that missed a message is right again after the next one.
 */
public record ShuttleLiveResponse(
        // STARTED, POSITION, STOP_REACHED, FINISHED - or SNAPSHOT for a plain fetch.
        String event,
        String shuttleTripId,
        String routeName,
        String status,
        Short currentStopSequence,
        int delayMinutes,
        Vehicle vehicle,
        List<Stop> stops) {

    public record Vehicle(double latitude, double longitude, Double heading, Instant at) {
    }

    public record Stop(
            String id,
            short sequence,
            String name,
            double latitude,
            double longitude,
            Instant scheduledAt,
            // Timetable plus the current delay. Null once the stop is passed.
            Instant expectedAt,
            Instant arrivedAt,
            // PASSED, CURRENT or UPCOMING
            String state) {
    }
}
