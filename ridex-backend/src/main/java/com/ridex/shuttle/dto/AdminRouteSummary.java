package com.ridex.shuttle.dto;

/**
 * A route as it appears in the list: counts, not contents.
 *
 * <p>The full response carries every stop, fare and schedule, which is three queries per route -
 * fine for the one route somebody opened, and 300 queries for a page of a hundred. The list needs
 * to say how many, not which.
 */
public record AdminRouteSummary(
        String id,
        String code,
        String name,
        String description,
        boolean active,
        long stopCount,
        long fareCount,
        long activeDepartures) {
}
