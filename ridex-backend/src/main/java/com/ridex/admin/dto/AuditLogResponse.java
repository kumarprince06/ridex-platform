package com.ridex.admin.dto;

import java.time.Instant;

public record AuditLogResponse(
        String id,
        String actorEmail,
        String action,
        String targetType,
        String targetId,
        String reason,
        String ipAddress,
        Instant occurredAt) {
}
