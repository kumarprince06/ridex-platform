package com.ridex.notification;

public enum DeliveryChannel {
    EMAIL,
    SMS,
    /** A notification to a signed-in device, delivered through Expo to both stores. */
    PUSH
}
