package com.ridex.notification;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

// The only way anything gets sent. No @Transactional: it joins the caller's transaction on
// purpose, so the row is written with the change that caused it and rolls back with it too.
@Service
@RequiredArgsConstructor
public class Notifier {

    private final OutboxRepository outboxRepository;

    public void enqueue(DeliveryChannel channel, String recipient, String eventType, String payload) {
        OutboxMessage message = new OutboxMessage();
        message.setChannel(channel);
        message.setRecipient(recipient);
        message.setEventType(eventType);
        message.setPayload(payload == null ? "" : payload);
        outboxRepository.save(message);
    }
}
