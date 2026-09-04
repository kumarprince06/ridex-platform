package com.ridex.support.dto;

import java.time.Instant;

public record TicketMessageResponse(
        String id,
        String authorRole,
        boolean fromSupport,
        String body,
        boolean internal,
        Instant createdAt) {
}
