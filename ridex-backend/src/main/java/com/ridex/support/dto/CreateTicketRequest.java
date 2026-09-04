package com.ridex.support.dto;

import com.ridex.support.domain.TicketCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// No priority: it is set from the category. A field the reporter controls means every ticket is
// urgent, and then none of them are.
public record CreateTicketRequest(
        @NotNull(message = "Choose what this is about")
        TicketCategory category,

        @NotBlank(message = "A subject is required")
        @Size(max = 160)
        String subject,

        @NotBlank(message = "Tell us what happened")
        @Size(min = 10, max = 4000, message = "Please describe the problem in at least 10 characters")
        String message,

        @Size(max = 26) String rideId) {
}
