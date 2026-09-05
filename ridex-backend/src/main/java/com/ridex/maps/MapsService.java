package com.ridex.maps;

import java.util.List;

import org.springframework.stereotype.Service;

import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.shared.exception.ProviderUnavailableException;

import lombok.RequiredArgsConstructor;

/**
 * Picks which maps provider answers.
 *
 * <p>Google when a key is configured, OpenStreetMap otherwise. Not a preference: without the key
 * Google throws on every call, and a console that cannot search for a place is a console where
 * somebody types coordinates by hand and gets one digit wrong.
 */
@Service
@RequiredArgsConstructor
public class MapsService {

    private final List<MapsProvider> providers;

    public List<GeoLocation> search(String query, int limit) {
        return geocoder().search(query, limit);
    }

    public GeoLocation geocode(String query) {
        return geocoder().geocode(query);
    }

    /**
     * Routing has one implementation, and it needs the key.
     *
     * <p>Deliberately not falling back: a straight line between two points is not a road distance,
     * and quoting a fare against it would undercharge every trip that goes round a lake.
     */
    public RouteEstimate route(double pickupLat, double pickupLng,
            double destinationLat, double destinationLng) {
        return providers.stream()
                .filter(provider -> provider.isConfigured() && provider.canRoute())
                .findFirst()
                .orElseThrow(() -> new ProviderUnavailableException(
                        "No routing provider is configured."))
                .route(pickupLat, pickupLng, destinationLat, destinationLng);
    }

    private MapsProvider geocoder() {
        return providers.stream()
                .filter(MapsProvider::isConfigured)
                .findFirst()
                .orElseThrow(() -> new ProviderUnavailableException(
                        "No maps provider is available."));
    }
}
