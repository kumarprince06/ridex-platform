package com.ridex.api.dto.auth;

import com.ridex.domain.user.UserRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        // BCrypt silently truncates input past 72 bytes, so anything longer is a false sense of
        // strength rather than extra security.
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        /**
         * Which kind of account to open. Only RIDER and DRIVER are accepted; staff roles are
         * provisioned by an existing admin and are rejected here.
         */
        @NotNull(message = "Role is required")
        UserRole role) {
}
