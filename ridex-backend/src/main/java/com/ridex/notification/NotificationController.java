package com.ridex.notification;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.notification.dto.NotificationResponse;
import com.ridex.platform.security.JwtPrincipal;

import lombok.RequiredArgsConstructor;

/**
 * The notification feed, for whoever is holding the phone.
 *
 * <p>Not role-restricted: riders and drivers both have one, and the rows are scoped to the token.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationFeedService feed;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<NotificationResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return feed.mine(principal.userId());
    }

    @GetMapping("/unread-count")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Long> unread(@AuthenticationPrincipal JwtPrincipal principal) {
        return Map.of("unread", feed.unreadCount(principal.userId()));
    }

    @PostMapping("/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal JwtPrincipal principal) {
        feed.markAllRead(principal.userId());
    }
}
