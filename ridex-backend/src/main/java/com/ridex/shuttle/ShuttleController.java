package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shuttle.dto.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/shuttle")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
public class ShuttleController {

    private final ShuttleService shuttleService;
    private final PassService passService;

    @GetMapping("/routes")
    @ResponseStatus(HttpStatus.OK)
    public List<RouteResponse> routes() {
        return shuttleService.routeResponses();
    }

    @GetMapping("/routes/{routeId}/departures")
    @ResponseStatus(HttpStatus.OK)
    public List<DepartureResponse> departures(@PathVariable String routeId) {
        return shuttleService.schedulesFor(routeId).stream()
                .map(schedule -> new DepartureResponse(
                        schedule.getId(), schedule.getDepartureTime().toString(),
                        schedule.getDaysOfWeek(), schedule.getSeatCapacity()))
                .toList();
    }

    /** The seat picker. Every seat, and which are already gone. */
    @GetMapping("/departures/{scheduleId}/seats")
    @ResponseStatus(HttpStatus.OK)
    public SeatMapResponse seats(@PathVariable String scheduleId, @RequestParam String date,
            @RequestParam(required = false) String boardingStopId,
            @RequestParam(required = false) String alightingStopId) {
        return shuttleService.seatMap(scheduleId, LocalDate.parse(date),
                boardingStopId, alightingStopId);
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public ShuttleBookingResponse book(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody BookSeatRequest request) {
        return shuttleService.book(principal.userId(), request);
    }

    @PostMapping("/bookings/{bookingId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String bookingId) {
        shuttleService.cancel(principal.userId(), bookingId);
    }

    @GetMapping("/passes/products")
    @ResponseStatus(HttpStatus.OK)
    public List<PassProductResponse> products(@RequestParam String routeId) {
        return passService.productsFor(routeId).stream()
                .map(product -> new PassProductResponse(
                        product.getId(), product.getName(), product.getDescription(),
                        product.getDurationDays(), product.getRideLimit(),
                        product.getCurrency(), product.getPriceMinor()))
                .toList();
    }

    @PostMapping("/passes")
    @ResponseStatus(HttpStatus.CREATED)
    public PassResponse buyPass(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody BuyPassRequest request) {
        return passService.buy(principal.userId(), request.productId(),
                request.startsOn() == null ? null : LocalDate.parse(request.startsOn()));
    }

    @GetMapping("/passes")
    @ResponseStatus(HttpStatus.OK)
    public List<PassResponse> myPasses(@AuthenticationPrincipal JwtPrincipal principal) {
        return passService.mine(principal.userId());
    }
}
