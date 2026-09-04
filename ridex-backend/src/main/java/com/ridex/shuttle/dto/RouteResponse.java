package com.ridex.shuttle.dto;

import java.util.List;

public record RouteResponse(
        String id, String code, String name, String description, List<StopResponse> stops) {

    public record StopResponse(String id, int sequence, String name, int offsetMinutes) {
    }
}
