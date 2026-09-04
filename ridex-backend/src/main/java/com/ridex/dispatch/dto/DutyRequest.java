package com.ridex.dispatch.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

// Going on duty needs a position: a driver dispatch cannot place is a driver it cannot offer to.
public record DutyRequest(
        @NotNull Boolean onDuty,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {
}
