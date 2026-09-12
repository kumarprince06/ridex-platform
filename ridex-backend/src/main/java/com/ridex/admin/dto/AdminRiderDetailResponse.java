package com.ridex.admin.dto;

import java.util.List;

/**
 * One rider, with what support is always asked about: their rides, their points and what they owe.
 *
 * <p>Dues first-class rather than derived on the screen: an unpaid cancellation fee is why a rider
 * cannot book, and it is the first thing an operator needs to see.
 */
public record AdminRiderDetailResponse(
        AdminRiderResponse rider,
        int pointsBalance,
        String currency,
        long outstandingDuesMinor,
        List<AdminTripResponse> recentRides) {
}
