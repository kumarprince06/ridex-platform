package com.ridex.shuttle.dto;

import java.time.LocalTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ScheduleRequest(
        @NotNull(message = "A departure time is required")
        LocalTime departureTime,

        /** ISO day numbers, comma separated: "1,2,3,4,5" is Monday to Friday. */
        @Pattern(regexp = "[1-7](,[1-7])*", message = "Days must be ISO day numbers like 1,2,3,4,5")
        String daysOfWeek,

        @Min(value = 1, message = "A shuttle seats at least one passenger")
        @Max(value = 60, message = "A shuttle seats at most 60 passengers")
        int seatCapacity,

        boolean active) {
}
