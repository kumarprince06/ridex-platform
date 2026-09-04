package com.ridex.ride;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CancellationQuote;
import com.ridex.ride.dto.CreateRideRequest;
import com.ridex.ride.dto.RideResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
public class RideController {

    private final RideRequestService rideRequestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RideResponse create(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CreateRideRequest request) {
        return rideRequestService.create(principal.userId(), request);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<RideResponse> list(@AuthenticationPrincipal JwtPrincipal principal) {
        return rideRequestService.list(principal.userId());
    }

    @GetMapping("/{rideId}")
    @ResponseStatus(HttpStatus.OK)
    public RideResponse get(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId) {
        return rideRequestService.get(principal.userId(), rideId);
    }

    // Read-only, so the rider sees the fee before confirming rather than discovering it after.
    @GetMapping("/{rideId}/cancellation-quote")
    @ResponseStatus(HttpStatus.OK)
    public CancellationQuote cancellationQuote(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId) {
        return rideRequestService.quoteCancellation(principal.userId(), rideId);
    }

    @PostMapping("/{rideId}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public RideResponse cancel(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @Valid @RequestBody CancelRideRequest request) {
        return rideRequestService.cancel(principal.userId(), rideId, request);
    }
}
