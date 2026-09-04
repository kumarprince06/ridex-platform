package com.ridex.shuttle.dto;

import java.time.Instant;
import java.util.List;

/** The seat picker: every seat on the departure, and which are gone. */
public record SeatMapResponse(
        String shuttleTripId,
        String routeName,
        Instant departsAt,
        int seatCapacity,
        List<SeatResponse> seats,
        int seatsAvailable) {

    public record SeatResponse(String label, boolean available) {
    }
}
