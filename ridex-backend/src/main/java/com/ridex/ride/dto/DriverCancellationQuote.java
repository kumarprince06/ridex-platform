package com.ridex.ride.dto;

/** What cancelling now would cost the driver, and why - shown before they swipe. */
public record DriverCancellationQuote(String currency, long penaltyMinor, boolean free, String note) {
}
