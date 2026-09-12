package com.ridex.shuttle.dto;

import com.ridex.payment.domain.PaymentMethod;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record BuyPassRequest(
        @NotBlank String productId,
        /** Optional. Defaults to today, so a commuter can buy next week's pass in advance. */
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Use a date like 2026-09-05")
        String startsOn,

        /** Online only - there is nobody to hand cash to when a pass is bought. */
        PaymentMethod paymentMethod,

        /** The whole balance may be offered; the server takes only what the price can absorb. */
        @PositiveOrZero Integer redeemPoints) {

    public PaymentMethod methodOrDefault() {
        return paymentMethod == null ? PaymentMethod.UPI : paymentMethod;
    }
}
