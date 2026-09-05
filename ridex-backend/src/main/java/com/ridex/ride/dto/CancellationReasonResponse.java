package com.ridex.ride.dto;

/** One choice on the cancel screen. @param needsDetail true when the rider must type something. */
public record CancellationReasonResponse(String code, String label, boolean needsDetail) {
}
