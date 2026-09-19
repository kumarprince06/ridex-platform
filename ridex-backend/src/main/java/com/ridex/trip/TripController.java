package com.ridex.trip;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import java.util.List;

import com.ridex.trip.dto.CompleteTripRequest;
import com.ridex.trip.dto.DriverTripSummary;
import com.ridex.trip.dto.StartTripRequest;
import com.ridex.trip.dto.TripResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class TripController {

    private final TripService tripService;

    /** This driver's own trips, newest first. */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<DriverTripSummary> history(@AuthenticationPrincipal JwtPrincipal principal) {
        return tripService.history(principal.userId());
    }

    /** The unfinished trip, or 204 when the driver has none. */
    @GetMapping("/current")
    public ResponseEntity<TripResponse> current(@AuthenticationPrincipal JwtPrincipal principal) {
        return tripService.currentForDriver(principal.userId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Everything the trip screens show: who the rider is, where they are going, what it costs. */
    @GetMapping("/{tripId}")
    @ResponseStatus(HttpStatus.OK)
    public TripResponse get(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String tripId) {
        return tripService.forDriver(principal.userId(), tripId);
    }

    @PostMapping("/{tripId}/arrive")
    @ResponseStatus(HttpStatus.OK)
    public TripResponse arrive(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String tripId) {
        return tripService.arrive(principal.userId(), tripId);
    }

    // The same endpoint whether the driver scanned the QR or typed the digits: one secret, and
    // the server is what decides it matches.
    @PostMapping("/{tripId}/start")
    @ResponseStatus(HttpStatus.OK)
    public TripResponse start(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String tripId, @Valid @RequestBody StartTripRequest request) {
        return tripService.start(principal.userId(), tripId, request);
    }

    @PostMapping("/{tripId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public TripResponse complete(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String tripId, @Valid @RequestBody CompleteTripRequest request) {
        return tripService.complete(principal.userId(), tripId, request);
    }
}
