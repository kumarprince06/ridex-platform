package com.ridex.ride.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.ridex.shared.exception.ConflictException;

class RideStatusTest {

    @Test
    void walksTheHappyPath() {
        RideStatus status = RideStatus.REQUESTED;
        for (RideStatus next : new RideStatus[] {
                RideStatus.SEARCHING, RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_ARRIVING,
                RideStatus.DRIVER_AT_PICKUP, RideStatus.TRIP_STARTED, RideStatus.COMPLETED}) {
            status = status.require(next);
        }

        assertThat(status).isEqualTo(RideStatus.COMPLETED);
        assertThat(status.isTerminal()).isTrue();
    }

    @Test
    void refusesToSkipStraightToCompleted() {
        assertThatThrownBy(() -> RideStatus.SEARCHING.require(RideStatus.COMPLETED))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void nothingLeavesATerminalState() {
        for (RideStatus terminal : RideStatus.values()) {
            if (!terminal.isTerminal()) {
                continue;
            }
            for (RideStatus next : RideStatus.values()) {
                assertThat(terminal.canMoveTo(next))
                        .as("%s -> %s", terminal, next)
                        .isFalse();
            }
        }
    }

    @Test
    void aRiderCannotCancelOnceTheTripHasStarted() {
        // Somebody is in the car. Ending it from there is an operator action, not a tap.
        assertThat(RideStatus.TRIP_STARTED.canMoveTo(RideStatus.CANCELLED_BY_RIDER)).isFalse();
        assertThat(RideStatus.TRIP_STARTED.canMoveTo(RideStatus.CANCELLED_BY_SYSTEM)).isTrue();
    }

    @Test
    void aRideCanBeCancelledAtEveryStageBeforeItStarts() {
        for (RideStatus status : new RideStatus[] {
                RideStatus.REQUESTED, RideStatus.SEARCHING, RideStatus.DRIVER_ASSIGNED,
                RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_AT_PICKUP}) {
            assertThat(status.canMoveTo(RideStatus.CANCELLED_BY_RIDER)).as("%s", status).isTrue();
        }
    }

    @Test
    void onlyASearchingRideCanExpire() {
        // Expiry means nobody accepted. It cannot happen once a driver is assigned.
        assertThat(RideStatus.SEARCHING.canMoveTo(RideStatus.EXPIRED)).isTrue();
        assertThat(RideStatus.DRIVER_ASSIGNED.canMoveTo(RideStatus.EXPIRED)).isFalse();
    }
}
