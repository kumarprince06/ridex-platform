package com.ridex.shuttle.dto;

import java.util.List;

public record RouteResponse(
        String id, String code, String name, String description, List<StopResponse> stops) {

    /**
     * Coordinates are on the rider's copy too, so the app can draw the route rather than list it.
     * A commuter picking between two stops is choosing a place, and a name alone does not say
     * which side of the flyover it is on.
     */
    public record StopResponse(
            String id, int sequence, String name,
            String latitude, String longitude, int offsetMinutes) {
    }
}
