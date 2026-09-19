package com.ridex.admin.dto;

import com.ridex.auth.domain.UserRole;

import jakarta.validation.constraints.NotNull;

public record StaffRoleRequest(@NotNull(message = "Pick a role") UserRole role) {
}
