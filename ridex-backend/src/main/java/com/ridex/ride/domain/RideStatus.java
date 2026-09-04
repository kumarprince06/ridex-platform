package com.ridex.ride.domain;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import com.ridex.shared.exception.ConflictException;

/**
 * The ride request machine from docs/11.
 *
 * <p>The legal moves live here and nowhere else: a service that decided transitions for itself
 * would be a second copy of this table, and the two would disagree within a release.
 */
public enum RideStatus {

    REQUESTED,
    SEARCHING,
    DRIVER_ASSIGNED,
    DRIVER_ARRIVING,
    DRIVER_AT_PICKUP,
    TRIP_STARTED,
    COMPLETED,

    CANCELLED_BY_RIDER,
    CANCELLED_BY_DRIVER,
    CANCELLED_BY_SYSTEM,
    EXPIRED;

    private static final Set<RideStatus> TERMINAL = EnumSet.of(
            COMPLETED, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER, CANCELLED_BY_SYSTEM, EXPIRED);

    private static final Map<RideStatus, Set<RideStatus>> ALLOWED = Map.of(
            REQUESTED, EnumSet.of(SEARCHING, CANCELLED_BY_RIDER, CANCELLED_BY_SYSTEM),
            SEARCHING, EnumSet.of(DRIVER_ASSIGNED, CANCELLED_BY_RIDER, CANCELLED_BY_SYSTEM, EXPIRED),
            DRIVER_ASSIGNED, EnumSet.of(DRIVER_ARRIVING, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER,
                    CANCELLED_BY_SYSTEM),
            DRIVER_ARRIVING, EnumSet.of(DRIVER_AT_PICKUP, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER,
                    CANCELLED_BY_SYSTEM),
            DRIVER_AT_PICKUP, EnumSet.of(TRIP_STARTED, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER,
                    CANCELLED_BY_SYSTEM),
            // Once someone is in the car it either finishes or an operator ends it. There is no
            // rider-cancels path here on purpose.
            TRIP_STARTED, EnumSet.of(COMPLETED, CANCELLED_BY_SYSTEM));

    public boolean isTerminal() {
        return TERMINAL.contains(this);
    }

    public boolean canMoveTo(RideStatus next) {
        return ALLOWED.getOrDefault(this, Set.of()).contains(next);
    }

    /** Throws rather than returning false: an illegal move is never something to carry on past. */
    public RideStatus require(RideStatus next) {
        if (!canMoveTo(next)) {
            throw new ConflictException("A ride that is " + this + " cannot become " + next + ".");
        }
        return next;
    }
}
