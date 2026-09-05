package com.ridex.notification;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Points at Mailpit locally, which accepts everything and delivers nothing onward, so a wrong
// address in development cannot reach a real person.
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailChannel implements NotificationChannel {

    /** On the classpath, not on a CDN: an inlined logo shows before anybody clicks "load images". */
    private static final String LOGO_PATH = "mail/logo.png";

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@ridex.local}")
    private String from;

    /** The name beside the address. Without it a client shows the raw mailbox, which reads as spam. */
    @Value("${app.mail.from-name:RideX}")
    private String fromName;

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
    public void send(String recipient, NotificationTemplates.Rendered rendered) {
        if (echoToLog) {
            log.info("MAIL to {} | {} | {}", recipient, rendered.subject(), rendered.body());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            // multipart/related, because the logo is a part of this message rather than a link out
            // to one - which is what lets it render with remote images blocked.
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(from, fromName);
            helper.setTo(recipient);
            helper.setSubject(rendered.subject());

            if (rendered.html() == null) {
                helper.setText(rendered.body(), false);
            } else {
                // Text first, HTML second: that argument order is the multipart/alternative order,
                // and a client picks the last part it understands.
                helper.setText(rendered.body(), rendered.html());
                helper.addInline(EmailLayout.LOGO_CID, new ClassPathResource(LOGO_PATH), "image/png");
            }

            if (rendered.attachment() != null) {
                NotificationTemplates.Attachment file = rendered.attachment();
                helper.addAttachment(file.filename(),
                        new org.springframework.core.io.ByteArrayResource(file.bytes()),
                        file.contentType());
            }

            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException ex) {
            // Wrapped so the outbox sees a failure and retries: a swallowed exception here is a
            // verification code that never arrives and never appears to have gone wrong.
            throw new IllegalStateException("Could not build the message for " + recipient, ex);
        }
    }
}
