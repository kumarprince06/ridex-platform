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
        List<SeatResponse> seats,
        int seatsAvailable) {

    public record SeatResponse(String label, boolean available) {
    }
}
