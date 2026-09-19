package com.ridex.shuttle.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

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
        boolean onSale,
        // One ride a working day is 26; a pass stops covering seats once its rides are used.
        @Min(value = 1, message = "A pass includes at least one ride a month")
        @Max(value = 62, message = "Two rides a day is 62 a month at most")
        int ridesPerMonth,
        // Most passes running on the route at once; null for no cap.
        @Positive(message = "The pass limit must be at least 1") Integer maxActivePasses) {
}
