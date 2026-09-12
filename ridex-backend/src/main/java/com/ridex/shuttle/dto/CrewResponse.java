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
        int seatCapacity,
        /**
         * Where the shuttle is, from fifteen minutes before it leaves. Null before that and
         * whenever the driver's phone has stopped reporting: a marker standing still at yesterday's
         * depot is worse than no marker.
         */
        Double latitude,
        Double longitude) {
}
