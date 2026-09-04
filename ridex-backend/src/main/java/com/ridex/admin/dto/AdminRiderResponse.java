package com.ridex.admin.dto;

import java.time.Instant;

public record AdminRiderResponse(
        String riderId,
        String userId,
        String email,
        String firstName,
        String lastName,
        String phone,
        String status,
        Instant lastLoginAt,
        Instant joinedAt) {
}
