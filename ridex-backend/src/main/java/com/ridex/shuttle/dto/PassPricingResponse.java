package com.ridex.shuttle.dto;

import java.util.List;

/** What a route sells: one row per plan, null prices until operations sets them. */
public record PassPricingResponse(Long monthlyPriceMinor, boolean onSale, List<Plan> plans) {

    public record Plan(
            String plan,
            String label,
            int months,
            int durationDays,
            Long priceMinor,
            // Off the monthly price times the months, which is what a rider compares against.
            int discountPercent,
            long activePasses) {
    }
}
