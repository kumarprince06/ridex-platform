package com.ridex.dto.response;

import java.time.LocalDateTime;

import com.ridex.enums.TenantLifecycleStatus;

public record TenantResponse(
        String id,
        TenantLifecycleStatus lifecycleStatus,
        LocalDateTime emailVerifiedAt,
        LocalDateTime onboardingCompletedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
