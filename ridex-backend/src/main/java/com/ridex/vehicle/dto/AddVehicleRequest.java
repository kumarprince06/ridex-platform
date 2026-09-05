package com.ridex.vehicle.dto;

import com.ridex.vehicle.domain.VehicleType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddVehicleRequest(
        @NotNull(message = "Vehicle type is required")
        VehicleType vehicleType,

        @NotBlank(message = "Make is required")
        @Size(max = 60, message = "Make must not exceed 60 characters")
        String make,

        @NotBlank(message = "Model is required")
        @Size(max = 60, message = "Model must not exceed 60 characters")
        String model,

        // No upper bound in the annotation: "not in the future" depends on today, so the service
        // checks it against the clock rather than hardcoding a year that goes stale.
        @Min(value = 1950, message = "Manufacture year must be 1950 or later")
        int manufactureYear,

        @Size(max = 30, message = "Colour must not exceed 30 characters")
        String color,

        @Min(value = 1, message = "A vehicle carries at least one passenger")
        @Max(value = 64, message = "A vehicle carries at most 64 passengers")
        int seatCapacity,

        @NotBlank(message = "Registration number is required")
        @Size(max = 20, message = "Registration number must not exceed 20 characters")
        String registrationNumber) {
}
