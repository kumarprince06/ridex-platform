package com.ridex.maps.nominatim;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ProviderUnavailableException;
import com.ridex.shared.exception.ValidationException;

/**
 * OpenStreetMap's geocoder. No key, no billing - the same reason the maps render on OpenFreeMap.
 *
 * <p>Called from the server rather than the browser on purpose: Nominatim's usage policy requires
 * an identifying User-Agent, which a browser will not let a page set, and going through here also
 * keeps the console's search traffic off a third party's view of individual staff.
 *
 * <p>ponytail: geocoding only. Nominatim does not route, so {@link #route} stays with the Google
 * provider - a straight-line fallback would quote a fare against a distance no car drives.
 */
@Service
@org.springframework.core.annotation.Order(2)
public class NominatimMapsProvider implements MapsProvider {

    private static final int MAX_RESULTS = 8;

    @Value("${app.nominatim.base-url:https://nominatim.openstreetmap.org}")
    private String baseUrl;

    /** Their policy asks for a real contact. A generic agent is what gets an IP blocked. */
    @Value("${app.nominatim.user-agent:RideX-Console/1.0 (ops@ridex.local)}")
    private String userAgent;

    /** Biases results towards one country. Blank searches the world. */
    @Value("${app.nominatim.country-codes:in}")
    private String countryCodes;

    @Override
    public boolean isConfigured() {
        // Nothing to configure. That is the point of it.
        return true;
    }

    @Override
    public boolean canRoute() {
        return false;
    }

    @Override
    public GeoLocation geocode(String query) {
        List<GeoLocation> results = search(query, 1);
        if (results.isEmpty()) {
            throw new NotFoundException("No place found for that search.");
        }
        return results.get(0);
    }

    @Override
    public List<GeoLocation> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            throw new ValidationException("Location query must not be blank");
        }

        String uri = "/search?format=jsonv2&addressdetails=0&limit=%d&q=%s%s".formatted(
                Math.min(Math.max(1, limit), MAX_RESULTS),
                encode(query.trim()),
                countryCodes.isBlank() ? "" : "&countrycodes=" + countryCodes);

        try {
            NominatimPlace[] places = client().get()
                    .uri(uri)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(NominatimPlace[].class);

            if (places == null) {
                return List.of();
            }
            return Arrays.stream(places)
                    .map(place -> new GeoLocation(
                            Double.parseDouble(place.lat()),
                            Double.parseDouble(place.lon()),
                            place.displayName()))
                    .toList();
        } catch (RestClientException ex) {
            throw new ProviderUnavailableException("Place search is unavailable right now", ex);
        }
    }

    @Override
    public RouteEstimate route(double pickupLat, double pickupLng,
            double destinationLat, double destinationLng) {
        throw new ProviderUnavailableException("Nominatim geocodes only; it cannot route.");
    }

    private RestClient client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .build();
    }

    private static String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    /** jsonv2 names them lat/lon as strings, and the label display_name. */
    private record NominatimPlace(String lat, String lon,
            @JsonProperty("display_name") String displayName) {
    }
}
