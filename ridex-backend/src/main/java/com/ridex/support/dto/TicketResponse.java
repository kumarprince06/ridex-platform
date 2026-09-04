package com.ridex.support.dto;

import java.time.Instant;
import java.util.List;

import com.ridex.support.domain.TicketCategory;
import com.ridex.support.domain.TicketPriority;
import com.ridex.support.domain.TicketStatus;

public record TicketResponse(
        String id,
        TicketCategory category,
        TicketPriority priority,
        TicketStatus status,
        String subject,
        String rideId,
        String raisedByRole,
        String raisedByEmail,
        Instant firstResponseAt,
        Instant resolvedAt,
        String resolution,
        Instant createdAt,
        List<TicketMessageResponse> messages) {
}
