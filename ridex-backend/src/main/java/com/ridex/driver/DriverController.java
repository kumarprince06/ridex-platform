package com.ridex.driver;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.platform.security.JwtPrincipal;
import java.util.List;

import com.ridex.driver.dto.DriverProfileResponse;
import com.ridex.rating.dto.DriverRatingResponse;
import com.ridex.rating.dto.RateRideRequest;
import com.ridex.ride.domain.CancellationReason;
import com.ridex.ride.domain.CancelledBy;
import com.ridex.ride.dto.CancelRideRequest;
import com.ridex.ride.dto.CancellationReasonResponse;
import com.ridex.ride.dto.DriverCancellationQuote;
import com.ridex.ride.dto.RideResponse;
import com.ridex.driver.dto.PayoutAccountRequest;
import com.ridex.driver.dto.PayoutAccountResponse;
import com.ridex.driver.dto.UpdateDriverProfileRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Driver profile")
@RestController
@RequestMapping("/api/v1/driver")
@RequiredArgsConstructor
// The account must actually hold the role, not merely have signed in from the driver app - the app
// context is a blast-radius control, not the authorization decision.
@PreAuthorize("hasRole('DRIVER')")
public class DriverController {

    private final DriverProfileService driverProfileService;
    private final com.ridex.ride.RideRequestService rideRequestService;
    private final com.ridex.rating.RatingService ratingService;
    private final DriverOnboardingService driverOnboardingService;

    @Operation(summary = "Get the driver's profile")
    @GetMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public DriverProfileResponse getProfile(@AuthenticationPrincipal JwtPrincipal principal) {
        return driverProfileService.get(principal.userId());
    }

    @Operation(summary = "Get the driver's onboarding status and what is missing")
    @GetMapping("/onboarding")
    @ResponseStatus(HttpStatus.OK)
    public com.ridex.driver.dto.OnboardingResponse onboarding(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return driverOnboardingService.status(principal.userId());
    }

    @Operation(summary = "Submit onboarding for review")
    @PostMapping("/onboarding/submit")
    @ResponseStatus(HttpStatus.OK)
    public com.ridex.driver.dto.OnboardingResponse submitForReview(
            @AuthenticationPrincipal JwtPrincipal principal) {
        return driverOnboardingService.submitForReview(principal.userId());
    }

    /** The stars riders have given this driver, with whatever they wrote. */
    @Operation(summary = "List the ratings riders have given this driver")
    @GetMapping("/ratings")
    @ResponseStatus(HttpStatus.OK)
    public List<DriverRatingResponse> ratings(@AuthenticationPrincipal JwtPrincipal principal) {
        return ratingService.receivedBy(principal.userId());
    }

    /** The reasons a driver may give, from the server, so the app cannot invent one. */
    @Operation(summary = "List the reasons a driver may give for cancelling")
    @GetMapping("/cancellation-reasons")
    @ResponseStatus(HttpStatus.OK)
    public List<CancellationReasonResponse> cancellationReasons() {
        return rideRequestService.cancellationReasons(CancelledBy.DRIVER);
    }

    /** Ends the rider's ride with a stated reason, rather than leaving them watching the map. */
    /** What cancelling now would cost for this reason, shown before the driver swipes. */
    @Operation(summary = "Preview what cancelling a ride would cost the driver")
    @GetMapping("/rides/{rideId}/cancellation-quote")
    @ResponseStatus(HttpStatus.OK)
    public DriverCancellationQuote cancellationQuote(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @RequestParam CancellationReason reasonCode) {
        return rideRequestService.quoteDriverCancellation(principal.userId(), rideId, reasonCode);
    }

    @Operation(summary = "Cancel a ride as the driver, with a reason")
    @PostMapping("/rides/{rideId}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public RideResponse cancelRide(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @Valid @RequestBody CancelRideRequest request) {
        return rideRequestService.cancelAsDriver(principal.userId(), rideId, request);
    }

    /** What the rider was like to carry. One per ride, like the rider's own rating. */
    @Operation(summary = "Rate the rider of a finished ride")
    @PostMapping("/rides/{rideId}/rate-rider")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rateRider(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String rideId, @Valid @RequestBody RateRideRequest request) {
        ratingService.rateRider(principal.userId(), rideId, request);
    }

    @Operation(summary = "Get the driver's payout bank details")
    @GetMapping("/payout-account")
    @ResponseStatus(HttpStatus.OK)
    public PayoutAccountResponse payoutAccount(@AuthenticationPrincipal JwtPrincipal principal) {
        return driverProfileService.payoutAccount(principal.userId());
    }

    @Operation(summary = "Set the driver's payout bank details")
    @PutMapping("/payout-account")
    @ResponseStatus(HttpStatus.OK)
    public PayoutAccountResponse setPayoutAccount(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody PayoutAccountRequest request) {
        return driverProfileService.setPayoutAccount(principal.userId(), request);
    }

    @Operation(summary = "Update the driver's profile")
    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public DriverProfileResponse updateProfile(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody UpdateDriverProfileRequest request) {
        return driverProfileService.update(principal.userId(), request);
    }
}
