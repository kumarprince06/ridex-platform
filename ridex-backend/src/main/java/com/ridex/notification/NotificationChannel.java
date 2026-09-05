package com.ridex.notification;

// One interface, one implementation per transport. Which one carries a message is a routing
// decision, never something the caller hard-codes.
public interface NotificationChannel {

    DeliveryChannel channel();

    /**
     * Sends one rendered message.
     *
     * <p>Takes the whole {@link NotificationTemplates.Rendered} rather than a subject and a body,
     * because a channel decides for itself which parts it can carry - email sends the HTML with the
     * text as a fallback, SMS and push have only the text and no subject line at all.
     */
    void send(String recipient, NotificationTemplates.Rendered rendered);
}
