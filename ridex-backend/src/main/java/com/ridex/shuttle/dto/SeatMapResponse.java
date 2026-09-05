package com.ridex.shuttle.dto;

import java.time.Instant;
import java.util.List;

/** The seat picker: every seat on the departure, and which are gone. */
public record SeatMapResponse(
        String shuttleTripId,
        String routeName,
        Instant departsAt,
        int seatCapacity,
        /** Seats abreast, so the picker draws the same rows the labels were generated from. */
        int seatsPerRow,
        /**
         * Seats before the aisle, 0 when there is none.
         *
         * <p>Sent rather than guessed by the client: two apps drawing the same bus differently is
         * how a rider picks the window seat and finds themselves next to the door.
         */
        int aisleAfter,
        List<SeatResponse> seats,
        int seatsAvailable) {

    public record SeatResponse(String label, boolean available) {
    }
}
