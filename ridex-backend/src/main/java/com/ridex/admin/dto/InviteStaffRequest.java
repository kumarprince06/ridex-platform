package com.ridex.admin.dto;

import com.ridex.auth.domain.UserRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InviteStaffRequest(
        @NotBlank(message = "Email is required") @Email(message = "That is not an email address") String email,
        @NotBlank(message = "First name is required") @Size(max = 60) String firstName,
        @Size(max = 60) String lastName,
        @NotNull(message = "Pick a role") UserRole role) {
}
