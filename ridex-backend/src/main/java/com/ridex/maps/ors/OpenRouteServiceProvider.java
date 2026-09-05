package com.ridex.maps.ors;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ProviderUnavailableException;

import lombok.extern.slf4j.Slf4j;

/**
 * Road routing from OpenRouteService.
 *
 * <p>Here because routing is the one thing the free geocoder cannot do, and Google's free tier
 * needs a card on file. This needs a key but no card and no billing account - 2,000 requests a day,
 * which is more than a development platform will ever ask for.
 *
 * <p>Ordered between Google and Nominatim: if somebody configures a Google key, that wins for both
 * geocoding and routing. Without one, this routes and Nominatim geocodes.
 */
@Slf4j
@Service
@Order(2)
public class OpenRouteServiceProvider implements MapsProvider {

    @Value("${app.ors.api-key:}")
    private String apiKey;

    @Value("${app.ors.base-url:https://api.openrouteservice.org}")
    private String baseUrl;

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public boolean canGeocode() {
        // Routing only. See geocode() below.
        return false;
    }

    @Override
    public boolean canRoute() {
        return isConfigured();
    }

    /**
     * ORS geocodes through Pelias, which needs its own quota.
     *
     * <p>Left unimplemented so place search stays on Nominatim: two geocoders would be two sets of
     * results for the same query, and the picker would show whichever provider happened to sort
     * first in the list.
     */
    @Override
    public GeoLocation geocode(String query) {
        throw new ProviderUnavailableException("OpenRouteService is used for routing only.");
    }

    @Override
    public List<GeoLocation> search(String query, int limit) {
        throw new ProviderUnavailableException("OpenRouteService is used for routing only.");
    }

    @Override
    public GeoLocation reverse(double latitude, double longitude) {
        throw new ProviderUnavailableException("OpenRouteService is used for routing only.");
    }

    @Override
    public RouteEstimate route(double pickupLat, double pickupLng,
            double destinationLat, double destinationLng) {
        if (!isConfigured()) {
            throw new ProviderUnavailableException("OpenRouteService is not configured");
        }

        // Longitude first. Their API follows GeoJSON, which is the reverse of how everyone says it
        // out loud - getting it backwards routes a Bengaluru trip through the Indian Ocean.
        Map<String, Object> body = Map.of("coordinates", List.of(
                List.of(pickupLng, pickupLat),
                List.of(destinationLng, destinationLat)));

        try {
            Map<?, ?> response = client().post()
                    .uri("/v2/directions/driving-car")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            Map<?, ?> summary = summaryIn(response);
            if (summary == null) {
                throw new NotFoundException("No road route between those points.");
            }

            double distance = ((Number) summary.get("distance")).doubleValue();
            long duration = ((Number) summary.get("duration")).longValue();

            // No traffic model in OpenRouteService: null says so rather than implying free roads.
            return new RouteEstimate(distance, duration,
                    "%.1f km".formatted(distance / 1000),
                    "%d min".formatted(Math.round(duration / 60.0)),
                    null);
        } catch (RestClientException ex) {
            throw new ProviderUnavailableException("Routing is unavailable right now", ex);
        }
    }

    /** routes[0].summary, defended against every level being absent. */
    private static Map<?, ?> summaryIn(Map<?, ?> response) {
        if (response == null || !(response.get("routes") instanceof List<?> routes) || routes.isEmpty()) {
            return null;
        }
        if (!(routes.get(0) instanceof Map<?, ?> first)) {
            return null;
        }
        return first.get("summary") instanceof Map<?, ?> summary ? summary : null;
    }

    private RestClient client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(8000);

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                // The key goes in Authorization, not a query parameter - a key in a URL ends up in
                // every proxy log between here and them.
                .defaultHeader(HttpHeaders.AUTHORIZATION, apiKey)
                .build();
    }
}
