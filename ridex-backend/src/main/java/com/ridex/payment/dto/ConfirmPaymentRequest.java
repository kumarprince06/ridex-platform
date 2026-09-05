package com.ridex.payment.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * What checkout hands back.
 *
 * <p>Only the payment id: the signature and order id it also returns are not trusted here, because
 * the server asks the gateway what the payment's status is rather than believing the client's copy
 * of it. A client is the one party with a reason to claim a payment succeeded.
 */
public record ConfirmPaymentRequest(
        @NotBlank(message = "The gateway payment id is required")
        String gatewayPaymentId) {
}
