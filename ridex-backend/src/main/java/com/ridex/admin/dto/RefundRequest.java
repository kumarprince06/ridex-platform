package com.ridex.admin.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefundRequest(
        @Min(value = 100, message = "A refund is at least Rs 1") long amountMinor,
        @NotBlank(message = "Say why - the rider and the audit log both see it")
        @Size(max = 500, message = "Keep the reason under 500 characters") String reason) {
}
