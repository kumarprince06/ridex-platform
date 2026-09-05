package com.ridex.ride.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// The rider picks a quote, not a price. Sending the estimate id rather than a fare means the
// client cannot name what it pays.
public record CreateRideRequest(
        @NotBlank(message = "Estimate is required")
        String estimateId,

        @Size(max = 255) String pickupAddress,
        @Size(max = 255) String destinationAddress,

        // Optional. The server decides what they are worth and how many are actually spendable -
        // a client naming a discount would be a client naming its own price.
        @Min(0) Integer redeemPoints,

        /**
         * CASH or UPI. Null means cash, which is what most riders pick and what the platform
         * settled on before there was a choice.
         *
         * <p>CARD and UPI both open the same checkout - the instrument is chosen inside it - so
         * the app only ever sends one of two values.
         */
        com.ridex.payment.domain.PaymentMethod paymentMethod) {
}
