package com.ridex.points.dto;

import java.time.Instant;

import com.ridex.points.domain.PointReason;

public record PointEntryResponse(
        String id,
        int points,
        PointReason reason,
        String note,
        Instant createdAt) {
}
