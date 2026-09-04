package com.ridex.shuttle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BuyPassRequest(
        @NotBlank String productId,
        /** Optional. Defaults to today, so a commuter can buy next week's pass in advance. */
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Use a date like 2026-09-05")
        String startsOn) {
}
