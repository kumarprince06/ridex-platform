package com.ridex.admin.dto;

import java.time.Instant;
import java.util.List;

/**
 * One payment, with the gateway events behind it.
 *
 * <p>The events are the point: a disputed charge is settled by what the provider actually sent and
 * when, not by a status column somebody can read two ways.
 */
public record AdminPaymentDetailResponse(
        AdminPaymentResponse payment,
        String provider,
        /** The gateway's own id - what support quotes when they open a ticket with Razorpay. */
        String providerPaymentId,
        String failureReason,
        List<Event> events) {

    public record Event(
            String id,
            String provider,
            String providerEventId,
            String eventType,
            Instant receivedAt) {
    }
}
