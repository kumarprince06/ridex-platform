package com.ridex.support.domain;

public enum TicketPriority {
    LOW,
    NORMAL,
    HIGH,
    // Safety. Never assigned by the person raising the ticket - it is set by category, or an
    // urgent queue is just the queue.
    URGENT
}
