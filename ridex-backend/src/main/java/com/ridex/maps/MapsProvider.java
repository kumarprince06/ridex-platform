package com.ridex.maps;

import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;

public interface MapsProvider {
    GeoLocation geocode(String query);

    RouteEstimate route(double pickupLat, double pickupLng, double destinationLat, double destinationLng);
}
