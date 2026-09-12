package com.ridex.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Changing a password from inside the app.
 *
 * <p>The current one is required even though the caller is already authenticated: a phone left
 * unlocked on a table is the threat, and a token alone should not be enough to lock the owner out
 * of their own account.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "Your current password is required")
        String currentPassword,

        // Same bounds as registration, deliberately: two password policies in one codebase means
        // one of them is wrong. BCrypt truncates past 72 bytes.
        @NotBlank(message = "A new password is required")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
        String newPassword) {
}
