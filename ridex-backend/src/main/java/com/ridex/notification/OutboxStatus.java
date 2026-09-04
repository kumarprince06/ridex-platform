package com.ridex.notification;

public enum OutboxStatus {
    PENDING,
    SENT,
    // Retries exhausted. Kept, not deleted: a dropped payout notice is an incident someone has to
    // be able to find.
    DEAD
}
