package com.ridex.domain.vehicle;

public enum VehicleStatus {

    PENDING_REVIEW,
    ACTIVE,
    /** Taken off the road by the driver - sold, in the garage, seasonal. */
    INACTIVE,
    REJECTED;

    public boolean isUsableForTrips() {
        return this == ACTIVE;
    }
}
