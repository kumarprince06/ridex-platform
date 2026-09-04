package com.ridex.support.domain;

public enum TicketStatus {
    OPEN,
    // An agent has it. Distinct from OPEN so the unassigned queue is visible.
    IN_PROGRESS,
    // Waiting on the person who raised it. Their reply reopens it automatically.
    AWAITING_REPLY,
    RESOLVED,
    CLOSED
}
