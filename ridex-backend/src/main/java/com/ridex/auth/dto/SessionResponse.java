package com.ridex.auth.dto;

import java.time.Instant;

// Never carries the token or its hash: this is a list of devices, not a list of credentials.
public record SessionResponse(
        String id,
        String userAgent,
        String ipAddress,
        Instant lastUsedAt,
        Instant createdAt,
        boolean current) {
}
