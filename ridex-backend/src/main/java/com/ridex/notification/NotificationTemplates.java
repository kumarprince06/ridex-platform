package com.ridex.notification;

import org.springframework.stereotype.Component;

// Wording in one place. ponytail: a switch, not a database table - templates move to the database
// when operations needs to edit them without a deploy, and not before.
@Component
public class NotificationTemplates {

    public record Rendered(String subject, String body) {
    }

    public Rendered render(OutboxMessage message) {
        return switch (message.getEventType()) {
            case "VERIFY_ACCOUNT" -> new Rendered(
                    "Your RideX verification code",
                    "Your RideX code is " + message.getPayload()
                            + ". It expires in 10 minutes. If you did not ask for it, ignore this message.");
            case "RESET_PASSWORD" -> new Rendered(
                    "Your RideX password reset code",
                    "Your RideX password reset code is " + message.getPayload()
                            + ". It expires in 10 minutes. If you did not ask for it, your password is unchanged.");
            case "ACCOUNT_EXISTS" -> new Rendered(
                    "About your RideX account",
                    "Someone tried to create a RideX account with this address, and one already exists. "
                            + "If that was you, sign in instead, or reset your password.");
            default -> throw new IllegalStateException("No template for " + message.getEventType());
        };
    }
}
