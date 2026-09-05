package com.ridex.ride;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.payment.PaymentService;
import com.ridex.payment.dto.ConfirmPaymentRequest;
import com.ridex.payment.dto.RidePaymentResponse;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.rating.RatingService;
import com.ridex.rating.dto.RateRideRequest;
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
    private final com.ridex.trip.TripService tripService;
    private final RatingService ratingService;
    private final PaymentService paymentService;

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

    /**
     * What is owed on a finished ride, and how to pay it.
     *
     * <p>Returns the gateway order to open checkout against. The amount comes from here, never
     * from the app - a client that names its own fare is a client that pays what it likes.
     */
    @GetMapping("/{rideId}/payment")
    @ResponseStatus(HttpStatus.OK)
    public RidePaymentResponse payment(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId) {
        return paymentService.forRider(principal.userId(), rideId);
    }

    /** The cancel screen's reason list, so the app never invents a code the server refuses. */
    @GetMapping("/cancellation-reasons")
    @ResponseStatus(HttpStatus.OK)
    public java.util.List<com.ridex.ride.dto.CancellationReasonResponse> cancellationReasons() {
        return rideRequestService.cancellationReasons();
    }

    /** What an earlier cancellation left owing, added to the next fare. */
    @GetMapping("/dues")
    @ResponseStatus(HttpStatus.OK)
    public com.ridex.ride.dto.CancellationQuote dues(@AuthenticationPrincipal JwtPrincipal principal) {
        return rideRequestService.outstandingDues(principal.userId());
    }

    /** Called after checkout closes. The gateway is asked; the app is not believed. */
    @PostMapping("/{rideId}/payment/confirm")
    @ResponseStatus(HttpStatus.OK)
    public RidePaymentResponse confirmPayment(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @Valid @RequestBody ConfirmPaymentRequest request) {
        return paymentService.confirmForRider(principal.userId(), rideId, request.gatewayPaymentId());
    }

    /** One rating per ride, and only after it completed. */
    @PostMapping("/{rideId}/rating")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rate(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String rideId,
            @Valid @RequestBody RateRideRequest request) {
        ratingService.rate(principal.userId(), rideId, request);
    }

    // Read-only, so the rider sees the fee before confirming rather than discovering it after.
    @GetMapping("/{rideId}/cancellation-quote")
    @ResponseStatus(HttpStatus.OK)
    public CancellationQuote cancellationQuote(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId) {
        return rideRequestService.quoteCancellation(principal.userId(), rideId);
    }

    /** The rider's receipt: what was quoted against what was charged, line for line. */
    @GetMapping("/{rideId}/receipt")
    @ResponseStatus(HttpStatus.OK)
    public com.ridex.trip.dto.FareComparisonResponse receipt(
            @AuthenticationPrincipal JwtPrincipal principal, @PathVariable String rideId) {
        // Ownership is checked first: the receipt itself is looked up by ride, not by caller.
        rideRequestService.get(principal.userId(), rideId);
        return tripService.receipt(rideId);
    }

    @PostMapping("/{rideId}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public RideResponse cancel(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @Valid @RequestBody CancelRideRequest request) {
        return rideRequestService.cancel(principal.userId(), rideId, request);
    }
}
