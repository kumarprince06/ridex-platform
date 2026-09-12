package com.ridex.places.dto;

import com.ridex.places.SavedPlace;

public record SavedPlaceResponse(
        String id,
        String label,
        String address,
        double latitude,
        double longitude) {

    public static SavedPlaceResponse of(SavedPlace place) {
        return new SavedPlaceResponse(place.getId(), place.getLabel(), place.getAddress(),
                place.getLatitude().doubleValue(), place.getLongitude().doubleValue());
    }
}
