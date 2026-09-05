package com.ridex.notification;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Wording in one place.
 *
 * <p>ponytail: a switch, not a database table - templates move to the database when operations
 * needs to edit them without a deploy, and not before.
 *
 * <p>Every message renders twice. The HTML is what people see; the plain text is what a client with
 * images off, a screen reader, or a spam filter reads - and a message with no text alternative
 * scores worse on every filter that looks.
 */
@Component
@RequiredArgsConstructor
public class NotificationTemplates {

    private final EmailLayout layout;

    /**
     * @param html null for channels that cannot render it. SMS and push take the text.
     */
    public record Rendered(String subject, String body, String html) {

        public static Rendered text(String subject, String body) {
            return new Rendered(subject, body, null);
        }
    }

    public Rendered render(OutboxMessage message) {
        String payload = message.getPayload();

        return switch (message.getEventType()) {
            case "VERIFY_ACCOUNT" -> new Rendered(
                    "Your RideX verification code",
                    "Your RideX code is " + payload
                            + ". It expires in 10 minutes. If you did not ask for it, ignore this message.",
                    layout.wrap("Your RideX verification code",
                            "Your code is " + payload + ", valid for 10 minutes.",
                            layout.heading("Confirm your email")
                                    + layout.paragraph("Enter this code in the app to finish setting up your account.")
                                    + layout.code(payload)
                                    + layout.note("It expires in 10 minutes. If you did not ask for it, "
                                            + "you can ignore this message.")));

            case "RESET_PASSWORD" -> new Rendered(
                    "Your RideX password reset code",
                    "Your RideX password reset code is " + payload
                            + ". It expires in 10 minutes. If you did not ask for it, your password is unchanged.",
                    layout.wrap("Your RideX password reset code",
                            "Your reset code is " + payload + ", valid for 10 minutes.",
                            layout.heading("Reset your password")
                                    + layout.paragraph("Enter this code in the app to choose a new password.")
                                    + layout.code(payload)
                                    + layout.note("It expires in 10 minutes. If you did not ask for it, "
                                            + "your password is unchanged and there is nothing to do.")));

            // Sent to the address, not to whoever typed it: it must not confirm that an account
            // exists to somebody probing for one, so it reads as news to the owner.
            case "ACCOUNT_EXISTS" -> new Rendered(
                    "About your RideX account",
                    "Someone tried to create a RideX account with this address, and one already exists. "
                            + "If that was you, sign in instead, or reset your password.",
                    layout.wrap("About your RideX account",
                            "Someone tried to sign up with this address.",
                            layout.heading("You already have an account")
                                    + layout.paragraph("Someone tried to create a RideX account with this "
                                            + "email address, and one already exists.")
                                    + layout.paragraph("If that was you, sign in instead - or use "
                                            + "“Forgot password” if you cannot get in.")
                                    + layout.note("If it was not you, nothing has changed on your account.")));

            case "SHUTTLE_BOOKED" -> new Rendered(
                    "Your seat is booked",
                    "Seat " + payload + ". Show your boarding code to the driver when you get on.",
                    layout.wrap("Your seat is booked",
                            "Seat " + payload + " is confirmed.",
                            layout.heading("Seat " + payload + " is yours")
                                    + layout.paragraph("Your shuttle seat is confirmed. Open the app to see "
                                            + "your boarding code and show it to the driver when you get on.")
                                    + layout.note("The code is in the app only - it is never sent by email.")));

            case "SHUTTLE_BOARDED" -> new Rendered(
                    "You are on board",
                    "Seat " + payload + " is checked in. Have a good trip.",
                    layout.wrap("You are on board",
                            "Seat " + payload + " is checked in.",
                            layout.heading("Checked in")
                                    + layout.paragraph("The driver has checked you into seat " + payload
                                            + ". Have a good trip.")));

            default -> throw new IllegalStateException("No template for " + message.getEventType());
        };
    }
}
