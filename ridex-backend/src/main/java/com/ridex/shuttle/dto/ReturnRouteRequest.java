package com.ridex.shuttle.dto;

import java.time.LocalTime;
import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** The evening departures for a return route. Days and vehicle size are copied from the original. */
public record ReturnRouteRequest(
        @NotEmpty(message = "Give the return at least one departure time")
        @Size(max = 12, message = "At most 12 departures at once")
        List<LocalTime> departureTimes) {
}
