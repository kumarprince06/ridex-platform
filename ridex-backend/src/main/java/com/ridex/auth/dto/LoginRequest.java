package com.ridex.auth.dto;

import com.ridex.auth.domain.AppContext;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String password,

        /**
         * Which surface is signing in. The rider app, driver app and ops panel are separate
         * clients; the token is scoped to the roles that surface may act with.
         */
        @NotNull(message = "App context is required")
        AppContext app) {
}
