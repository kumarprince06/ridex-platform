package com.ridex.maps;

import java.util.List;

import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;

public interface MapsProvider {

    /** The single best match. Used where the caller already knows what it is looking for. */
    GeoLocation geocode(String query);

    /**
     * Candidates for a partial query.
     *
     * <p>Separate from {@link #geocode}, because a person typing "marathahalli" into a picker is
     * choosing between places, and handing them the first hit as if it were the answer is how a
     * stop ends up on the wrong side of a flyover.
     */
    List<GeoLocation> search(String query, int limit);

    /**
     * The address at a point, for a pin dropped on the map.
     *
     * <p>The rider who cannot name where they are standing is the one who most needs the pickup
     * to be right, and a bare pair of coordinates on a confirmation screen tells them nothing
     * about whether the pin is on their side of the road.
     */
    GeoLocation reverse(double latitude, double longitude);

    /** Whether this provider can actually be called - a key it needs, and has. */
    boolean isConfigured();

    /**
     * Whether it can turn a query into places.
     *
     * <p>Separate from routing because a provider can genuinely do one and not the other: the free
     * router geocodes through a different product with its own quota, and the free geocoder cannot
     * route at all.
     */
    boolean canGeocode();

    /**
     * Whether it can do road distances, not just places.
     *
     * <p>Separate from {@link #isConfigured()} because they differ: the free geocoder needs no key
     * and cannot route, so a single flag would have routing pick it and fail on every fare.
     */
    boolean canRoute();

    RouteEstimate route(double pickupLat, double pickupLng, double destinationLat, double destinationLng);
}
