package com.ridex.location;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

class PositionDistanceTest {

    @Test
    void oneDegreeOfLatitudeIsAbout111Km() {
        assertThat(new DriverPresence.Position(0, 0).metresTo(1, 0)).isCloseTo(111_195, within(50));
    }

    @Test
    void samePointIsZero() {
        assertThat(new DriverPresence.Position(22.639, 88.34).metresTo(22.639, 88.34)).isZero();
    }
}
