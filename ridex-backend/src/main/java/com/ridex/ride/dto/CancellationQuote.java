package com.ridex.ride.dto;

/** What cancelling would cost right now, so the rider is told before they confirm, not after. */
public record CancellationQuote(String currency, long feeMinor, boolean free) {
}
