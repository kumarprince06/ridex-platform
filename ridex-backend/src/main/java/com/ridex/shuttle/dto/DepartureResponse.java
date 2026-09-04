package com.ridex.shuttle.dto;

public record DepartureResponse(
        String scheduleId, String departureTime, String daysOfWeek, int seatCapacity) {
}
