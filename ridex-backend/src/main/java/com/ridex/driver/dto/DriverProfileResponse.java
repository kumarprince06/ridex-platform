package com.ridex.driver.dto;

import java.math.BigDecimal;

import com.ridex.driver.domain.DriverOnboardingStatus;

public record DriverProfileResponse(
        String id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String profileImageKey,
        // Read-only here. Onboarding moves through DriverProfile.transitionTo, never through a
        // profile edit, or a driver could approve themselves.
        DriverOnboardingStatus onboardingStatus,
        BigDecimal rating,
        int ratingCount) {
}
