package com.ridex.notification;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.notification.dto.NotificationResponse;

import lombok.RequiredArgsConstructor;

/**
 * What a person has been told, and what they have not read yet.
 *
 * <p>Scoped to the caller everywhere: a feed is the one place where somebody else's rows would be
 * a list of their rides, their payments and where they were picked up.
 */
@Service
@RequiredArgsConstructor
public class NotificationFeedService {

    private final UserNotificationRepository repository;

    /** The last fifty. Nobody scrolls past that, and a feed is not an archive. */
    @Transactional(readOnly = true)
    public List<NotificationResponse> mine(String userId) {
        return repository.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(String userId) {
        return repository.countByUserIdAndReadAtIsNull(userId);
    }

    /** Opening the screen is the acknowledgement, so this is one statement rather than per row. */
    @Transactional
    public void markAllRead(String userId) {
        repository.markAllRead(userId, Instant.now());
    }
}
