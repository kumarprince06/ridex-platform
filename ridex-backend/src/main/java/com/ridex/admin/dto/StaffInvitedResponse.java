package com.ridex.admin.dto;

/** The new account and its one-time password. Shown once; it is not stored anywhere readable. */
public record StaffInvitedResponse(StaffResponse staff, String temporaryPassword) {
}
