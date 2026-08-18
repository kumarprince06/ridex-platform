package com.ridex.infrastructure.maps;

public interface MapsProvider {
    GeoLocation geocode(String query);

    RouteEstimate route(double pickupLat, double pickupLng, double destinationLat, double destinationLng);
}
