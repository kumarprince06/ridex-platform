package com.ridex.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.driver.domain.DriverOnboardingStatus;

public record AdminDriverResponse(
        String driverId,
        String userId,
        String email,
        String firstName,
        String lastName,
        String phone,
        DriverOnboardingStatus onboardingStatus,
        boolean onDuty,
        BigDecimal rating,
        int ratingCount,
        Instant joinedAt) {
}
