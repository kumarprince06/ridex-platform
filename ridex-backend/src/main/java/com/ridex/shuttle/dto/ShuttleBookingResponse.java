package com.ridex.shuttle.dto;

import java.time.Instant;

public record ShuttleBookingResponse(
        String id,
        String routeName,
        String seatLabel,
        String boardingStopName,
        String alightingStopName,
        Instant departsAt,
        String currency,
        long fareMinor,
        /** Set when a pass covered the seat, so nothing was charged. */
        String passId,
        String status,
        /** The six digits the rider shows, or the QR encoding the same value. */
        String boardingCode) {
}
