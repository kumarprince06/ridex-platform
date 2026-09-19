package com.ridex.shuttle.dto;

import java.time.Instant;
import java.time.LocalDate;

/** One pass as operations sees it: who holds it, on which route, and whether it still runs. */
public record AdminPassResponse(
        String id,
        String riderName,
        String riderEmail,
        String routeName,
        String plan,
        LocalDate startsOn,
        LocalDate endsOn,
        int ridesUsed,
        String currency,
        long pricePaidMinor,
        String status,
        Instant boughtAt) {
}
