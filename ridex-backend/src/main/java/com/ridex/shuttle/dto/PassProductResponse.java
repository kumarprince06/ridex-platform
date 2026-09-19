package com.ridex.shuttle.dto;

public record PassProductResponse(
        String id, String name, String description,
        int durationDays, int rideLimit, String currency, long priceMinor,
        // For comparing plans: how many months it covers, what that is per month, and how much
        // less than buying the monthly pass that many times.
        int months, long perMonthMinor, int savePercent) {
}
