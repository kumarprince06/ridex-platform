package com.ridex.shuttle;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.payment.dto.ConfirmPaymentRequest;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shuttle.dto.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Shuttle (rider)")
@RestController
@RequestMapping("/api/v1/shuttle")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
public class ShuttleController {

    private final ShuttleService shuttleService;
    private final PassService passService;
    private final ShuttleCrew shuttleCrew;
    private final ShuttleRunService shuttleRunService;

    @Operation(summary = "List shuttle routes")
    @GetMapping("/routes")
    @ResponseStatus(HttpStatus.OK)
    public List<RouteResponse> routes() {
        return shuttleService.routeResponses();
    }

    @Operation(summary = "List a route's departure times and their crews")
    @GetMapping("/routes/{routeId}/departures")
    @ResponseStatus(HttpStatus.OK)
    public List<DepartureResponse> departures(@PathVariable String routeId) {
        return shuttleService.schedulesFor(routeId).stream()
                .map(schedule -> new DepartureResponse(
                        schedule.getId(), schedule.getDepartureTime().toString(),
                        schedule.getDaysOfWeek(), schedule.getSeatCapacity(),
                        shuttleCrew.of(schedule.getDriverId(), schedule.getVehicleId())))
                .toList();
    }

    /** The seat picker. Every seat, and which are already gone. */
    @Operation(summary = "Get a departure's seat map")
    @GetMapping("/departures/{scheduleId}/seats")
    @ResponseStatus(HttpStatus.OK)
    public SeatMapResponse seats(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String scheduleId, @RequestParam String date,
            @RequestParam(required = false) String boardingStopId,
            @RequestParam(required = false) String alightingStopId) {
        return shuttleService.seatMap(scheduleId, LocalDate.parse(date),
                boardingStopId, alightingStopId, principal == null ? null : principal.userId());
    }

    /** Called after checkout closes. The gateway is asked; the app is not believed. */
    @Operation(summary = "Confirm a seat payment with the gateway")
    @PostMapping("/bookings/{bookingId}/payment/confirm")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleBookingResponse confirmPayment(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String bookingId,
            @Valid @RequestBody ConfirmPaymentRequest request) {
        return shuttleService.confirmPayment(principal.userId(), bookingId,
                request.gatewayPaymentId());
    }

    /** The rider's own seats. Booking one and never seeing it again is not a booking. */
    @Operation(summary = "List the rider's shuttle bookings")
    @GetMapping("/bookings")
    @ResponseStatus(HttpStatus.OK)
    public List<ShuttleBookingResponse> myBookings(@AuthenticationPrincipal JwtPrincipal principal) {
        return shuttleService.myBookings(principal.userId());
    }

    /** Where the rider's shuttle is and when it reaches their stop. Live updates follow on the socket. */
    @Operation(summary = "Track the rider's shuttle live")
    @GetMapping("/bookings/{bookingId}/live")
    @ResponseStatus(HttpStatus.OK)
    public BookingLiveResponse live(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String bookingId) {
        return shuttleRunService.forRider(principal.userId(), bookingId);
    }

    @Operation(summary = "Book a shuttle seat")
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public ShuttleBookingResponse book(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody BookSeatRequest request) {
        return shuttleService.book(principal.userId(), request);
    }

    @Operation(summary = "Cancel a shuttle booking")
    @PostMapping("/bookings/{bookingId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String bookingId) {
        shuttleService.cancel(principal.userId(), bookingId);
    }

    @Operation(summary = "List the shuttle passes on sale")
    @GetMapping("/passes/products")
    @ResponseStatus(HttpStatus.OK)
    public List<PassProductResponse> products(@RequestParam String routeId) {
        return passService.productsFor(routeId);
    }

    @Operation(summary = "Buy a shuttle pass")
    @PostMapping("/passes")
    @ResponseStatus(HttpStatus.CREATED)
    public PassResponse buyPass(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody BuyPassRequest request) {
        return passService.buy(principal.userId(), request.productId(),
                request.startsOn() == null ? null : LocalDate.parse(request.startsOn()),
                request.methodOrDefault(), request.redeemPoints());
    }

    /** Confirms the gateway payment, which is what makes the pass usable. */
    @Operation(summary = "Confirm a pass payment with the gateway")
    @PostMapping("/passes/{passId}/payment/confirm")
    @ResponseStatus(HttpStatus.OK)
    public PassResponse confirmPassPayment(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String passId, @Valid @RequestBody ConfirmPaymentRequest request) {
        return passService.confirmPayment(principal.userId(), passId, request.gatewayPaymentId());
    }

    @Operation(summary = "List the rider's shuttle passes")
    @GetMapping("/passes")
    @ResponseStatus(HttpStatus.OK)
    public List<PassResponse> myPasses(@AuthenticationPrincipal JwtPrincipal principal) {
        return passService.mine(principal.userId());
    }
}
