package com.ridex.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Points at Mailpit locally, which accepts everything and delivers nothing onward, so a wrong
// address in development cannot reach a real person.
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailChannel implements NotificationChannel {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@ridex.local}")
    private String from;

    // Development escape hatch. Without an SMTP server every verification mail retries and dies,
    // which blocks signup entirely - and there is no free SMS route in India to fall back to.
    @Value("${app.mail.echo-to-log:false}")
    private boolean echoToLog;

    @PostConstruct
    void warnIfEchoing() {
        if (echoToLog) {
            log.warn("app.mail.echo-to-log is ON - verification codes are being written to the "
                    + "log and no mail is being sent. Never enable this outside development.");
        }
    }

    @Override
    public DeliveryChannel channel() {
        return DeliveryChannel.EMAIL;
    }

    @Override
    public void send(String recipient, String subject, String body) {
        if (echoToLog) {
            log.info("MAIL to {} | {} | {}", recipient, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
