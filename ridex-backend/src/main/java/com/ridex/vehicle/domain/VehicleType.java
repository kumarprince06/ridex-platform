package com.ridex.vehicle.domain;

/**
 * The physical class of vehicle, ordered smallest to largest.
 *
 * <p>Ride types offered to riders (economy, premium, pooled, XL) are a pricing concern and map onto
 * these later - they are not the same list, so they are not this enum. That is why there is no
 * LUXURY_SEDAN here: a luxury sedan is a SEDAN that a pricing rule sells differently.
 */
public enum VehicleType {

    BICYCLE,
    SCOOTER,
    MOTORCYCLE,
    E_RICKSHAW,
    AUTO_RICKSHAW,
    HATCHBACK,
    SEDAN,
    MPV,
    SUV,
    VAN,
    PICKUP,
    MINIBUS,
    BUS;

    /**
     * Passenger seats the vehicle can plausibly carry, excluding the driver.
     *
     * <p>The SQL CHECK is a flat 1..64 because a per-type bound needs a CASE per type. This is
     * that bound, kept here because it is a fact about the vehicle class - a hatchback sold as a
     * seven-seater is a data entry error, and nothing downstream can tell once it is saved.
     */
    public int maxSeats() {
        return switch (this) {
            case BICYCLE, SCOOTER, MOTORCYCLE -> 1;
            case E_RICKSHAW, AUTO_RICKSHAW -> 3;
            case HATCHBACK, SEDAN, PICKUP -> 4;
            case MPV, SUV -> 6;
            case VAN -> 8;
            case MINIBUS -> 24;
            case BUS -> 64;
        };
    }
}
