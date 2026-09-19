package com.ridex.wallet.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmTopUpRequest(@NotBlank(message = "The gateway payment id is required") String gatewayPaymentId) {
}
