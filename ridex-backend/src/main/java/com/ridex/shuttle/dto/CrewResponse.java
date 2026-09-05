package com.ridex.shuttle.dto;

/**
 * Who is driving a departure and what they are driving.
 *
 * <p>Null until a departure has a crew. A rider standing at a stop is looking for a registration
 * plate, not a driver id, so this is the plate, the vehicle and a name - nothing internal.
 */
public record CrewResponse(
        String driverName,
        String driverPhone,
        String driverRating,
        String vehicle,
        String registrationNumber,
        int seatCapacity) {
}
