package com.ridex.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateSettingRequest(
        @NotBlank(message = "A value is required")
        @Size(max = 255)
        String value) {
}
