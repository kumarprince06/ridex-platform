package com.ridex.admin.dto;

/** The counts the dashboard leads with. Deliberately small: every number here is a query. */
public record DashboardResponse(
        long ridersTotal,
        long driversTotal,
        long driversAwaitingReview,
        long driversOnDuty,
        long ridesToday,
        long ridesInProgress,
        long ridesCompletedToday,
        String currency,
        long grossFaresTodayMinor,
        // Every status with at least one ride, so the console shows the real spread rather than a
        // fixed list of states that may not exist yet.
        java.util.Map<String, Long> ridesByStatus) {
}
