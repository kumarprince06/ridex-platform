package com.ridex.admin.dto;

import java.time.Instant;
import java.util.List;

/**
 * One departure as ops sees it: how full it is, who is driving, and who is on board.
 *
 * <p>Cancelled seats are listed rather than hidden. "Why is 3B empty when it sold" is an ops
 * question, and a manifest that quietly drops the row cannot answer it.
 */
public record AdminDepartureResponse(
        String shuttleTripId,
        String scheduleId,
        String routeName,
        Instant departsAt,
        int seatCapacity,
        int seatsSold,
        int seatsCancelled,
        int boarded,
        /** Null until somebody is rostered onto it. */
        String driverId,
        String driverName,
        String vehicle,
        String registrationNumber,
        // Live run: SCHEDULED, RUNNING or COMPLETED, the last stop reached and how late it is.
        String runStatus,
        String currentStop,
        int delayMinutes,
        List<Seat> seats) {

    public record Seat(
            String bookingId,
            String seatLabel,
            String riderName,
            String riderEmail,
            String boardingStopName,
            String alightingStopName,
            String status,
            String paymentStatus,
            Instant boardedAt) {
    }
}
