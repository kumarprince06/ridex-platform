package com.ridex.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The bank's UTR or the provider's transfer id. A settled payout with no reference cannot be traced. */
public record SettlePayoutRequest(
        @NotBlank(message = "A payment reference is required")
        @Size(max = 100, message = "Reference must not exceed 100 characters")
        String reference) {
}
