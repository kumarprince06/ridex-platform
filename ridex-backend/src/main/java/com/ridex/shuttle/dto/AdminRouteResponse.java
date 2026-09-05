package com.ridex.shuttle.dto;

import java.time.LocalTime;
import java.util.List;

/**
 * A route with everything hanging off it: stops in order, the fare matrix and the timetable.
 *
 * <p>One response rather than four endpoints, because none of these mean anything alone - a stop
 * without its route is not a place, and a fare without its two stops is a number.
 */
public record AdminRouteResponse(
        String id,
        String code,
        String name,
        String description,
        boolean active,
        List<Stop> stops,
        List<Fare> fares,
        List<Schedule> schedules) {

    public record Stop(
            String id, int sequence, String name,
            String latitude, String longitude, int offsetMinutes) {
    }

    public record Fare(
            String id, String fromStopId, String toStopId, String currency, long fareMinor) {
    }

    public record Schedule(
            String id, LocalTime departureTime, String daysOfWeek,
            int seatCapacity, int seatsPerRow, boolean active) {
    }
}
