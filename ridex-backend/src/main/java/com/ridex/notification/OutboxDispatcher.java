package com.ridex.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

// Drains the outbox. Nothing sends inside a business transaction: a completed signup must not be
// rolled back because a mail server was briefly unreachable.
@Slf4j
@Component
public class OutboxDispatcher {

    private static final int BATCH = 50;
    private static final short MAX_ATTEMPTS = 6;

    private final OutboxRepository outboxRepository;
    private final Map<DeliveryChannel, NotificationChannel> channels;
    private final NotificationTemplates templates;

    public OutboxDispatcher(OutboxRepository outboxRepository, List<NotificationChannel> channels,
            NotificationTemplates templates) {
        this.outboxRepository = outboxRepository;
        this.channels = channels.stream()
                .collect(Collectors.toMap(NotificationChannel::channel, Function.identity()));
        this.templates = templates;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-ms:5000}")
    @Transactional
    public void dispatchPending() {
        List<OutboxMessage> batch = outboxRepository.claimBatch(Instant.now(), PageRequest.of(0, BATCH));

        for (OutboxMessage message : batch) {
            try {
                NotificationTemplates.Rendered rendered = templates.render(message);
                channels.get(message.getChannel())
                        .send(message.getRecipient(), rendered.subject(), rendered.body());

                message.setStatus(OutboxStatus.SENT);
                message.setSentAt(Instant.now());
            } catch (RuntimeException ex) {
                recordFailure(message, ex);
            }
        }
    }

    private void recordFailure(OutboxMessage message, RuntimeException ex) {
        short attempts = (short) (message.getAttempts() + 1);
        message.setAttempts(attempts);
        message.setLastError(ex.getMessage() == null ? ex.toString() : ex.getMessage());

        if (attempts >= MAX_ATTEMPTS) {
            // Kept rather than deleted: a message nobody received is something someone has to find.
            message.setStatus(OutboxStatus.DEAD);
            log.error("Outbox message {} dead after {} attempts", message.getId(), attempts);
            return;
        }

        // Exponential backoff: 2s, 4s, 8s ... so a provider outage is not hammered.
        message.setNextAttemptAt(Instant.now().plus(Duration.ofSeconds(1L << attempts)));
    }
}
