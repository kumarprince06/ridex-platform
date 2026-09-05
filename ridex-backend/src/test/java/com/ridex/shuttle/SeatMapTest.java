package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SeatMapTest {

    @Test
    void labelsRunFourAcrossFromTheFront() {
        assertThat(SeatMap.labelsFor(6, SeatMap.DEFAULT_SEATS_PER_ROW))
                .containsExactly("1A", "1B", "1C", "1D", "2A", "2B");
    }

    @Test
    void aCapacityThatIsNotAMultipleOfFourStopsPartWayThroughARow() {
        // A 14-seater really does have a short back row; inventing two extra seats would sell them.
        assertThat(SeatMap.labelsFor(14, SeatMap.DEFAULT_SEATS_PER_ROW)).hasSize(14).endsWith("4B");
    }

    @Test
    void aSeatBeyondCapacityIsNotValid() {
        assertThat(SeatMap.isValid("4A", 14, SeatMap.DEFAULT_SEATS_PER_ROW)).isTrue();
        assertThat(SeatMap.isValid("9D", 14, SeatMap.DEFAULT_SEATS_PER_ROW)).isFalse();
    }
}
