package com.ridex.notification.push;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DeviceTokenRequest(
        @NotBlank(message = "A device token is required")
        @Size(max = 255, message = "Token must not exceed 255 characters")
        String token,

        @NotBlank(message = "Platform is required")
        @Pattern(regexp = "ios|android|web", message = "Platform must be ios, android or web")
        String platform,

        /** Which app registered it, so a rider notice never lands on the driver app. */
        @NotBlank(message = "App context is required")
        @Pattern(regexp = "RIDER|DRIVER", message = "App must be RIDER or DRIVER")
        String app) {
}
