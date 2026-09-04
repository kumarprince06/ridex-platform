package com.ridex.maps.google;

import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;

import java.net.URI;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GoogleMapsProvider implements MapsProvider {

    private static final String GEOCODE_PATH = "/maps/api/geocode/json";
    private static final String DISTANCE_MATRIX_PATH = "/maps/api/distancematrix/json";

    private final GoogleMapsProperties properties;

    @Override
    public GeoLocation geocode(String query) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Location query must not be blank");
        }

        String apiKey = properties.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Google Maps API key is not configured");
        }

        RestClient client = restClient();
        String uri = String.format("%s?address=%s&key=%s", GEOCODE_PATH, encode(query), apiKey);

        try {
            GoogleGeocodeResponse response = client.get()
                    .uri(uri)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(GoogleGeocodeResponse.class);

            if (response == null || response.results() == null || response.results().isEmpty()) {
                throw new IllegalStateException("No geocoding result found for query: " + query);
            }

            GoogleGeocodeResult result = response.results().get(0);
            return new GeoLocation(
                    result.geometry().location().lat(),
                    result.geometry().location().lng(),
                    result.formattedAddress());
        } catch (RestClientException ex) {
            throw new IllegalStateException("Google Maps geocoding request failed", ex);
        }
    }

    @Override
    public RouteEstimate route(double pickupLat, double pickupLng, double destinationLat, double destinationLng) {
        String apiKey = properties.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Google Maps API key is not configured");
        }

        RestClient client = restClient();
        String uri = String.format(
                "%s?origins=%s,%s&destinations=%s,%s&key=%s",
                DISTANCE_MATRIX_PATH,
                pickupLat,
                pickupLng,
                destinationLat,
                destinationLng,
                apiKey);

        try {
            GoogleDistanceMatrixResponse response = client.get()
                    .uri(uri)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(GoogleDistanceMatrixResponse.class);

            if (response == null || response.rows() == null || response.rows().isEmpty()) {
                throw new IllegalStateException("No route estimate returned from Google Maps");
            }

            GoogleDistanceRow row = response.rows().get(0);
            if (row.elements() == null || row.elements().isEmpty()) {
                throw new IllegalStateException("No route elements returned from Google Maps");
            }

            GoogleDistanceElement element = row.elements().get(0);
            return new RouteEstimate(
                    element.distance().value(),
                    element.duration().value(),
                    element.distance().text(),
                    element.duration().text());
        } catch (RestClientException ex) {
            throw new IllegalStateException("Google Maps route request failed", ex);
        }
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, "RideX/1.0")
                .build();
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    private record GoogleGeocodeResponse(List<GoogleGeocodeResult> results) {}

    private record GoogleGeocodeResult(String formattedAddress, GoogleGeometry geometry) {}

    private record GoogleGeometry(GoogleLocation location) {}

    private record GoogleLocation(double lat, double lng) {}

    private record GoogleDistanceMatrixResponse(List<GoogleDistanceRow> rows) {}

    private record GoogleDistanceRow(List<GoogleDistanceElement> elements) {}

    private record GoogleDistanceElement(GoogleDistance distance, GoogleDuration duration) {}

    private record GoogleDistance(String text, double value) {}

    private record GoogleDuration(String text, long value) {}
}
