package com.ridex.api.controller.maps;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.infrastructure.maps.GeoLocation;
import com.ridex.infrastructure.maps.MapsProvider;
import com.ridex.infrastructure.maps.RouteEstimate;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/maps")
@RequiredArgsConstructor
public class MapsController {

    private final MapsProvider mapsProvider;

    @GetMapping("/geocode")
    @ResponseStatus(HttpStatus.OK)
    public GeoLocation geocode(@RequestParam String query) {
        return mapsProvider.geocode(query);
    }

    @GetMapping("/route")
    @ResponseStatus(HttpStatus.OK)
    public RouteEstimate route(
            @RequestParam double pickupLat,
            @RequestParam double pickupLng,
            @RequestParam double destinationLat,
            @RequestParam double destinationLng) {
        return mapsProvider.route(pickupLat, pickupLng, destinationLat, destinationLng);
    }
}
