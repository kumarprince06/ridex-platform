package com.ridex.location;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** The pins the rider's map, the shuttle ticket and the ops map are all drawn from. */
@SpringBootTest
class DriverPresenceTest {

    @Autowired private DriverPresence driverPresence;

    @Test
    void aReportedDriverCanBeFoundAgainAndDisappearsWhenTheyGoOffDuty() {
        String driverId = "presence-" + System.nanoTime();

        driverPresence.report(driverId, 12.9716, 77.5946);

        var at = driverPresence.positionOf(driverId).orElseThrow();
        // Redis geohashes the point, so it comes back within metres rather than bit-identical.
        assertThat(at.latitude()).isCloseTo(12.9716, within(0.001));
        assertThat(at.longitude()).isCloseTo(77.5946, within(0.001));

        driverPresence.goOffDuty(driverId);

        // Off duty is off the map: a marker nobody is behind is worse than no marker.
        assertThat(driverPresence.positionOf(driverId)).isEmpty();
    }

    @Test
    void aDriverWhoNeverReportedHasNoPosition() {
        assertThat(driverPresence.positionOf("nobody-" + System.nanoTime())).isEmpty();
    }
}
