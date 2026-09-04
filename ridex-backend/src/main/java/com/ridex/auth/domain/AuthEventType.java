package com.ridex.auth.domain;

// Stored as the enum name, so entries are never renumbered.
public enum AuthEventType {

    LOGIN_SUCCEEDED,
    LOGIN_FAILED,
    LOGIN_BLOCKED,
    LOGOUT,
    TOKEN_REFRESHED,

    // A spent refresh token was replayed: revokes every session for the account.
    REFRESH_TOKEN_REUSED
}
