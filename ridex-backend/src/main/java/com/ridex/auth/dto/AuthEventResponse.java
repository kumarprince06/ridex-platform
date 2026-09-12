package com.ridex.auth.dto;

import java.time.Instant;

/** One line of login history: what happened, from where, and when. */
public record AuthEventResponse(
        String eventType,
        String ipAddress,
        String userAgent,
        Instant occurredAt) {
}
