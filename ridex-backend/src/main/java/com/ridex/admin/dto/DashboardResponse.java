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
        long grossFaresTodayMinor) {
}
