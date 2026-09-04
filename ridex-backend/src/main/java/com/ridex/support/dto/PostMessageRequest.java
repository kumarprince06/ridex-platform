package com.ridex.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostMessageRequest(
        @NotBlank(message = "A message is required")
        @Size(max = 4000)
        String body,

        /** Agents only. Ignored when the ticket's owner posts. */
        Boolean internal) {
}
