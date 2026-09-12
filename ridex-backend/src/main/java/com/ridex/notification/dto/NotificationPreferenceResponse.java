package com.ridex.notification.dto;

/** What a person wants to be told about. Everything is on until they say otherwise. */
public record NotificationPreferenceResponse(boolean push, boolean email, boolean promotions) {
}
