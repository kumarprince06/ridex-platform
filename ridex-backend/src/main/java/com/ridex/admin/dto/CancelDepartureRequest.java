package com.ridex.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelDepartureRequest(
        @NotBlank(message = "Say why - every rider on it is told")
        @Size(max = 200, message = "Keep the reason under 200 characters") String reason) {
}
