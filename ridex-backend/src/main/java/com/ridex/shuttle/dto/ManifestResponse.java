package com.ridex.shuttle.dto;

import java.time.Instant;
import java.util.List;

/**
 * What the driver needs at each stop: who gets on, who gets off, and how full the shuttle is
 * after it pulls away.
 *
 * <p>Per stop rather than one passenger list, because that is the question actually being asked at
 * the door - "how many here?" - and counting a flat list at every stop is how a driver leaves
 * somebody standing.
 */
public record ManifestResponse(
        String shuttleTripId,
        String routeName,
        Instant departsAt,
        int seatCapacity,
        int seatsSold,
        List<StopManifest> stops) {

    public record StopManifest(
            String stopId,
            int sequence,
            String name,
            /** Minutes after departure, so the driver reads a running order, not clock times. */
            int offsetMinutes,
            int boardingCount,
            int alightingCount,
            /** Passengers on board after this stop. Never above capacity if the maths is right. */
            int onBoardAfter,
            List<Passenger> boarding,
            List<Passenger> alighting) {
    }

    /**
     * No boarding code here.
     *
     * <p>Only its hash is stored, and handing the driver the code would let a seat be marked
     * boarded without the passenger ever showing it - which is the one thing the code exists for.
     */
    public record Passenger(
            String bookingId,
            String seatLabel,
            String riderName,
            String alightingStopName,
            boolean boarded) {
    }
}
