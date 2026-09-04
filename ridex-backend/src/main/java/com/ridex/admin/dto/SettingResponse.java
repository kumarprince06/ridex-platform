package com.ridex.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SettingResponse(
        String key,
        String value,
        String label,
        String description,
        String valueType,
        BigDecimal minValue,
        BigDecimal maxValue,
        Instant updatedAt) {
}
