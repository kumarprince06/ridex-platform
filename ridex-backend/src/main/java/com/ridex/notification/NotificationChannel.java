package com.ridex.notification;

// One interface, one implementation per transport. Which one carries a message is a routing
// decision, never something the caller hard-codes.
public interface NotificationChannel {

    DeliveryChannel channel();

    void send(String recipient, String subject, String body);
}
