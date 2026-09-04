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
    BUS
}
