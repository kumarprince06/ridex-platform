package com.ridex.admin.dto;

import java.util.List;

/**
 * A daily series for the console's charts.
 *
 * <p>One row per day including days with nothing, because a line that skips empty days draws a
 * trend that did not happen.
 */
public record AnalyticsResponse(
        String currency,
        List<DayPoint> days,
        List<StatusSlice> ridesByStatus,
        List<StatusSlice> paymentsByMethod) {

    public record DayPoint(String date, long ridesRequested, long ridesCompleted, long grossMinor) {
    }

    public record StatusSlice(String label, long count) {
    }
}
