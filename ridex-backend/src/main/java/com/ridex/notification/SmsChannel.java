package com.ridex.notification;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

// ponytail: logs instead of sending. A real provider needs an account, per-message billing and -
// for India - DLT template registration, none of which should be decided by whoever wires the
// interface. Swap the body of send() for the provider client; nothing above this changes.
@Slf4j
@Component
public class SmsChannel implements NotificationChannel {

    @Override
    public DeliveryChannel channel() {
        return DeliveryChannel.SMS;
    }

    @Override
    public void send(String recipient, NotificationTemplates.Rendered rendered) {
        // Never log the body in production - it carries the OTP. No subject either: SMS has none,
        // and prefixing one would eat characters out of a 160-character budget.
        log.info("SMS to {} ({} chars) - no provider configured, not sent",
                recipient, rendered.body().length());
    }
}
