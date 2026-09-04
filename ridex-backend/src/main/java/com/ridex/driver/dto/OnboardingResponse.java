package com.ridex.driver.dto;

import java.time.Instant;

import com.ridex.driver.domain.DriverOnboardingStatus;

public record OnboardingResponse(
        String driverId,
        String email,
        DriverOnboardingStatus status,
        boolean eligibleToDrive,
        Instant reviewedAt,
        String rejectionReason) {
}
