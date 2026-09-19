package com.ridex.admin;

import com.ridex.shuttle.dto.ReturnRouteRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.PageResponse;
import com.ridex.shuttle.AdminShuttleService;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.AdminRouteSummary;
import com.ridex.shuttle.dto.AssignDepartureRequest;
import com.ridex.shuttle.dto.FareMatrixRequest;
import com.ridex.shuttle.dto.FareRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ridex.shuttle.dto.PassPricingRequest;
import com.ridex.shuttle.dto.PassPricingResponse;

/**
 * Shuttle routes, for operations.
 *
 * <p>Every write returns the whole route. A stop, a fare and a schedule are only meaningful next to
 * each other, and one response means the console never renders a half-updated route.
 */
@RestController
@RequestMapping("/api/v1/admin/shuttle/routes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminShuttleController {

    private final AdminShuttleService adminShuttleService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminRouteSummary> routes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return PageResponse.of(adminShuttleService.routes(page, size),
                Function.identity());
    }

    @GetMapping("/{routeId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse route(@PathVariable String routeId) {
        return adminShuttleService.route(routeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminRouteResponse create(@Valid @RequestBody RouteRequest request) {
        return adminShuttleService.create(request);
    }

    @PutMapping("/{routeId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse update(@PathVariable String routeId,
            @Valid @RequestBody RouteRequest request) {
        return adminShuttleService.update(routeId, request);
    }

    @GetMapping("/{routeId}/passes")
    @ResponseStatus(HttpStatus.OK)
    public PassPricingResponse passPricing(@PathVariable String routeId) {
        return adminShuttleService.passPricing(routeId);
    }

    @PutMapping("/{routeId}/passes")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "PASS_PRICING_CHANGED", targetType = "ROUTE")
    public PassPricingResponse setPassPricing(@PathVariable String routeId,
            @Valid @RequestBody PassPricingRequest request) {
        return adminShuttleService.setPassPricing(routeId, request);
    }

    /** The driver and vehicle a departure time normally runs with. */
    @PutMapping("/{routeId}/schedules/{scheduleId}/crew")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "REGULAR_CREW_SET", targetType = "ROUTE")
    public AdminRouteResponse setRegularCrew(@PathVariable String routeId, @PathVariable String scheduleId,
            @Valid @RequestBody AssignDepartureRequest request) {
        return adminShuttleService.setRegularCrew(routeId, scheduleId, request);
    }

    @DeleteMapping("/{routeId}/schedules/{scheduleId}/crew")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "REGULAR_CREW_CLEARED", targetType = "ROUTE")
    public AdminRouteResponse clearRegularCrew(@PathVariable String routeId, @PathVariable String scheduleId) {
        return adminShuttleService.setRegularCrew(routeId, scheduleId, null);
    }

    /** The same route the other way, hidden until operations switches it on. */
    @PostMapping("/{routeId}/return")
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "ROUTE_CREATED", targetType = "ROUTE")
    public AdminRouteResponse createReturn(@PathVariable String routeId,
            @Valid @RequestBody ReturnRouteRequest request) {
        return adminShuttleService.createReturn(routeId, request);
    }

    @DeleteMapping("/{routeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoute(@PathVariable String routeId) {
        adminShuttleService.deleteRoute(routeId);
    }

    /** Appends, or inserts straight after the stop at position {@code after} (0 for the front). */
    @PostMapping("/{routeId}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminRouteResponse addStop(@PathVariable String routeId,
            @RequestParam(required = false) Integer after,
            @Valid @RequestBody StopRequest request) {
        return adminShuttleService.addStop(routeId, request, after);
    }

    @PutMapping("/{routeId}/stops/{stopId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse updateStop(@PathVariable String routeId, @PathVariable String stopId,
            @Valid @RequestBody StopRequest request) {
        return adminShuttleService.updateStop(routeId, stopId, request);
    }

    @DeleteMapping("/{routeId}/stops/{stopId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse removeStop(@PathVariable String routeId, @PathVariable String stopId) {
        return adminShuttleService.removeStop(routeId, stopId);
    }

    @PutMapping("/{routeId}/fares")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse setFare(@PathVariable String routeId,
            @Valid @RequestBody FareRequest request) {
        return adminShuttleService.setFare(routeId, request);
    }

    /** The whole table in one save. What is sent is what the route charges afterwards. */
    @PutMapping("/{routeId}/fares/matrix")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse setFares(@PathVariable String routeId,
            @Valid @RequestBody FareMatrixRequest request) {
        return adminShuttleService.setFares(routeId, request);
    }

    @DeleteMapping("/{routeId}/fares/{fareId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse removeFare(@PathVariable String routeId, @PathVariable String fareId) {
        return adminShuttleService.removeFare(routeId, fareId);
    }

    @PostMapping("/{routeId}/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminRouteResponse addSchedule(@PathVariable String routeId,
            @Valid @RequestBody ScheduleRequest request) {
        return adminShuttleService.addSchedule(routeId, request);
    }

    @PutMapping("/{routeId}/schedules/{scheduleId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse updateSchedule(@PathVariable String routeId,
            @PathVariable String scheduleId, @Valid @RequestBody ScheduleRequest request) {
        return adminShuttleService.updateSchedule(routeId, scheduleId, request);
    }

    /** Who is driving one dated departure. Until this runs, the seats are sold with no driver. */
    @PostMapping("/schedules/{scheduleId}/departures/{serviceDate}/assign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assign(@PathVariable String scheduleId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate serviceDate,
            @Valid @RequestBody AssignDepartureRequest request) {
        adminShuttleService.assignDeparture(scheduleId, serviceDate, request);
    }
}
