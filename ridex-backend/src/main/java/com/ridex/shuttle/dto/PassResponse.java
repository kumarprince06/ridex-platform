package com.ridex.shuttle.dto;

import java.time.LocalDate;

public record PassResponse(
        String id,
        String productName,
        String routeName,
        LocalDate startsOn,
        LocalDate endsOn,
        int rideLimit,
        int ridesUsed,
        String currency,
        long pricePaidMinor,
        String status) {
}
