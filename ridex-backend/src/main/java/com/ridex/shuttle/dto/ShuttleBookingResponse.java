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
        String boardingCode,
        /** Null until the departure has a crew: who is driving, and the plate to look for. */
        CrewResponse crew,
        /** PAID, CASH_DUE, or PENDING while the seat is held for a rider still in checkout. */
        String paymentStatus,
        /** Cancellation closes here - half an hour before departure. */
        java.time.Instant cancellableUntil,
        /**
         * What cancelling right now would credit back as points, in money terms. Zero for cash, a
         * pass, or past the cutoff.
         */
        long creditIfCancelledMinor,
        /** Present only on a fresh booking that still has to be paid for. */
        Checkout checkout) {

    /**
     * What the app needs to open Razorpay, and nothing it should not have. The amount comes from
     * here rather than the client, so an app cannot open checkout for a fare it chose itself.
     */
    public record Checkout(String gatewayOrderId, String gatewayKeyId, long amountMinor,
            String currency) {
    }
}
