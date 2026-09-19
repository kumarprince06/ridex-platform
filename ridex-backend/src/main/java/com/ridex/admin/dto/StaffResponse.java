package com.ridex.admin.dto;

import java.time.Instant;
import java.util.List;

public record StaffResponse(
        String id,
        String email,
        String name,
        List<String> roles,
        String status,
        Instant lastLoginAt,
        Instant createdAt) {
}
