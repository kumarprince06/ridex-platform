package com.ridex.notification.dto;

import java.time.Instant;

import com.ridex.notification.UserNotification;

/** One line in the feed, in the words the person was actually told. */
public record NotificationResponse(
        String id,
        String eventType,
        String title,
        String body,
        String referenceType,
        String referenceId,
        boolean read,
        Instant createdAt) {

    public static NotificationResponse of(UserNotification row) {
        return new NotificationResponse(row.getId(), row.getEventType(), row.getTitle(),
                row.getBody(), row.getReferenceType(), row.getReferenceId(),
                row.getReadAt() != null, row.getCreatedAt());
    }
}
