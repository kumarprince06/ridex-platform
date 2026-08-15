package com.ridex.api.dto.tenant;

import java.time.Instant;

import com.ridex.domain.tenant.TenantLifecycleStatus;

public record TenantResponse(
        String id,
        TenantLifecycleStatus lifecycleStatus,
        Instant emailVerifiedAt,
        Instant onboardingCompletedAt,
        Instant createdAt,
        Instant updatedAt) {
}
