package com.ridex.points.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplyReferralRequest(
        @NotBlank(message = "A referral code is required")
        @Size(max = 12, message = "That is not a RideX referral code")
        String code) {
}
