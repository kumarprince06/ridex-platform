package com.ridex.vehicle.dto;

import java.time.Instant;

import com.ridex.vehicle.domain.DriverVehicle;
import com.ridex.vehicle.domain.VehicleStatus;
import com.ridex.vehicle.domain.VehicleType;

public record VehicleResponse(
        String id,
        VehicleType vehicleType,
        VehicleStatus status,
        String make,
        String model,
        int manufactureYear,
        String color,
        int seatCapacity,
        String registrationNumber,
        Instant createdAt) {

    public static VehicleResponse of(DriverVehicle vehicle) {
        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getVehicleType(),
                vehicle.getStatus(),
                vehicle.getMake(),
                vehicle.getModel(),
                vehicle.getManufactureYear(),
                vehicle.getColor(),
                vehicle.getSeatCapacity(),
                vehicle.getRegistrationNumber(),
                vehicle.getCreatedAt());
    }
}
