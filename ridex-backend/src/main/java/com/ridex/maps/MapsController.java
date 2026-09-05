package com.ridex.maps;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.maps.domain.GeoLocation;
import com.ridex.maps.domain.RouteEstimate;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/maps")
@RequiredArgsConstructor
public class MapsController {

    private final MapsService mapsService;

    @GetMapping("/geocode")
    @ResponseStatus(HttpStatus.OK)
    public GeoLocation geocode(@RequestParam String query) {
        return mapsService.geocode(query);
    }

    /** Candidates for a partial query, for a picker rather than a lookup. */
    @GetMapping("/search")
    @ResponseStatus(HttpStatus.OK)
    public java.util.List<GeoLocation> search(@RequestParam String query,
            @RequestParam(defaultValue = "6") int limit) {
        return mapsService.search(query, limit);
    }

    /**
     * The address at a point the rider pinned on the map.
     *
     * <p>Through the backend like every other maps call, so the key stays on the server and the
     * daily budget is counted in one place.
     */
    @GetMapping("/reverse")
    @ResponseStatus(HttpStatus.OK)
    public GeoLocation reverse(@RequestParam double lat, @RequestParam double lng) {
        return mapsService.reverse(lat, lng);
    }

    @GetMapping("/route")
    @ResponseStatus(HttpStatus.OK)
    public RouteEstimate route(
            @RequestParam double pickupLat,
            @RequestParam double pickupLng,
            @RequestParam double destinationLat,
            @RequestParam double destinationLng) {
        return mapsService.route(pickupLat, pickupLng, destinationLat, destinationLng);
    }
}
