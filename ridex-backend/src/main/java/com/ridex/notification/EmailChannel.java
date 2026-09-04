package com.ridex.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

// Points at Mailpit locally, which accepts everything and delivers nothing onward, so a wrong
// address in development cannot reach a real person.
@Component
@RequiredArgsConstructor
public class EmailChannel implements NotificationChannel {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@ridex.local}")
    private String from;

    @Override
    public DeliveryChannel channel() {
        return DeliveryChannel.EMAIL;
    }

    @Override
    public void send(String recipient, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
