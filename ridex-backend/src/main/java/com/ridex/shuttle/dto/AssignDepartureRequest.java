package com.ridex.shuttle.dto;

import jakarta.validation.constraints.NotBlank;

/** Who is driving one departure, and in what. Both or neither - a driver with no vehicle cannot run it. */
public record AssignDepartureRequest(
        @NotBlank(message = "A driver is required")
        String driverId,

        @NotBlank(message = "A vehicle is required")
        String vehicleId) {
}
