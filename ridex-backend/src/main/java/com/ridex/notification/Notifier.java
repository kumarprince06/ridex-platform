package com.ridex.notification;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

// The only way anything gets sent. No @Transactional: it joins the caller's transaction on
// purpose, so the row is written with the change that caused it and rolls back with it too.
@Service
@RequiredArgsConstructor
public class Notifier {

    private final OutboxRepository outboxRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final NotificationTemplates templates;

    public void enqueue(DeliveryChannel channel, String recipient, String eventType, String payload) {
        OutboxMessage message = new OutboxMessage();
        message.setChannel(channel);
        message.setRecipient(recipient);
        message.setEventType(eventType);
        message.setPayload(payload == null ? "" : payload);
        outboxRepository.save(message);
    }

    /**
     * Tells one person something: a push now, and a row in their feed to find it again later.
     *
     * <p>Both from one call, because a notification a rider swiped away and can never find again
     * is the same as one that was never sent - and two call sites would drift the moment somebody
     * adds an event to only one of them.
     */
    public void notifyUser(String userId, String eventType, String payload,
            String referenceType, String referenceId) {
        enqueue(DeliveryChannel.PUSH, userId, eventType, payload);

        OutboxMessage rendering = new OutboxMessage();
        rendering.setEventType(eventType);
        rendering.setPayload(payload == null ? "" : payload);
        var rendered = templates.render(rendering);

        UserNotification row = new UserNotification();
        row.setUserId(userId);
        row.setEventType(eventType);
        row.setTitle(rendered.subject());
        // The plain text, never the HTML: a feed is a list of sentences, not a browser.
        row.setBody(rendered.body());
        row.setReferenceType(referenceType);
        row.setReferenceId(referenceId);
        userNotificationRepository.save(row);
    }
}
