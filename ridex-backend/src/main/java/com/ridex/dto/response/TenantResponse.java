package com.ridex.dto.response;

import java.time.Instant;

import com.ridex.enums.TenantLifecycleStatus;

public record TenantResponse(
        String id,
        TenantLifecycleStatus lifecycleStatus,
        Instant emailVerifiedAt,
        Instant onboardingCompletedAt,
        Instant createdAt,
        Instant updatedAt) {
}
