package com.ridex.dto.response;

/**
 * Deliberately carries nothing but a message. The verification token must never leave the server
 * through the API - the email is its only delivery channel.
 */
public record RegisterResponse(String message) {
}
