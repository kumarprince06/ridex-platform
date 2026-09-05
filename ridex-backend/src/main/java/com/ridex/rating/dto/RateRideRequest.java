package com.ridex.rating.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record RateRideRequest(
        // One to five. Zero is not "no rating" here - a rider who does not want to rate simply
        // does not send one.
        @Min(value = 1, message = "A rating is between 1 and 5 stars")
        @Max(value = 5, message = "A rating is between 1 and 5 stars")
        int stars,

        @Size(max = 500, message = "Comment must not exceed 500 characters")
        String comment) {
}
