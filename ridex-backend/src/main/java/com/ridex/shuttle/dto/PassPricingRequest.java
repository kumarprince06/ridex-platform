package com.ridex.shuttle.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** A route's pass prices: the monthly price, and how much cheaper per month the longer plans are. */
public record PassPricingRequest(
        @Min(value = 100, message = "A monthly pass costs at least Rs 1")
        long monthlyPriceMinor,
        @Min(value = 0, message = "A discount cannot be negative")
        @Max(value = 60, message = "A discount above 60% gives the route away")
        int quarterlyDiscountPercent,
        @Min(value = 0, message = "A discount cannot be negative")
        @Max(value = 60, message = "A discount above 60% gives the route away")
        int halfYearlyDiscountPercent,
        @Min(value = 0, message = "A discount cannot be negative")
        @Max(value = 60, message = "A discount above 60% gives the route away")
        int yearlyDiscountPercent,
        boolean onSale) {
}
