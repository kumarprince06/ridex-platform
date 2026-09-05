package com.ridex.shuttle.dto;

public record DepartureResponse(
        String scheduleId, String departureTime, String daysOfWeek, int seatCapacity,
        /** Known before booking: a rider picks the 08:15 partly by which bus turns up. */
        CrewResponse crew) {
}
