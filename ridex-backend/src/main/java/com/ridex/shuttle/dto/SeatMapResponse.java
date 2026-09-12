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
        int seatsAvailable,
        /**
         * What this leg costs, when the caller named both stops.
         *
         * <p>On the seat map so the picker can show what points take off before the rider agrees
         * to it - a discount that only appears on the ticket is a surprise, not an offer.
         */
        Long fareMinor,
        String currency) {

    public record SeatResponse(String label, boolean available) {
    }
}
