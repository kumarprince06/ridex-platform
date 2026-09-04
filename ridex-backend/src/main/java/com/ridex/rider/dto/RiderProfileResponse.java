package com.ridex.rider.dto;

public record RiderProfileResponse(
        String id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String profileImageKey) {
}
