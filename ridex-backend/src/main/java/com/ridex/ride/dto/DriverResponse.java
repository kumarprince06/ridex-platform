package com.ridex.ride.dto;

/**
 * The driver on a ride, once dispatch has assigned one.
 *
 * <p>Null until then. A rider waiting at the kerb is matching a name and a plate against the car
 * pulling up, so this is exactly that and nothing internal.
 */
public record DriverResponse(
        String name,
        String phone,
        String rating,
        String vehicle,
        String registrationNumber,
        /**
         * Where the car is right now, or null when the driver's phone has stopped reporting.
         *
         * <p>Null rather than the last known pin: a marker that stopped moving ten minutes ago is
         * worse than no marker, because the rider keeps waiting at it. Carried on the ride the app
         * already polls, so following a driver costs no extra request.
         */
        Double latitude,
        Double longitude) {
}
