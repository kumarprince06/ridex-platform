package com.ridex.ride.dto;

import com.ridex.ride.domain.CancellationReason;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Why the ride was cancelled.
 *
 * <p>A code and, for OTHER, the rider's own words. The code is what operations can count; the text
 * is what tells them a code is missing from the list.
 */
public record CancelRideRequest(
        @NotNull(message = "A reason is required")
        CancellationReason reasonCode,

        @Size(max = 500)
        String reason) {

    /** OTHER with nothing written is not a reason. */
    public boolean isDetailMissing() {
        return reasonCode != null && reasonCode.needsDetail()
                && (reason == null || reason.isBlank());
    }

    /** What is stored as the human-readable reason: their words if given, the label otherwise. */
    public String text() {
        return reason == null || reason.isBlank() ? reasonCode.label() : reason.trim();
    }
}
