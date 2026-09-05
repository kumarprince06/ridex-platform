package com.ridex.shuttle.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StopRequest(
        @NotBlank(message = "Stop name is required")
        @Size(max = 120, message = "Stop name must not exceed 120 characters")
        String name,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
        BigDecimal latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
        BigDecimal longitude,

        /**
         * Minutes after departure, not a wall-clock time. One row serves every departure on the
         * route, which is why the timetable does not need re-entering per schedule.
         */
        @Min(value = 0, message = "The offset cannot be negative")
        int offsetMinutes) {
}
