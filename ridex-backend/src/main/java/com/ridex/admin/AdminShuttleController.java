package com.ridex.admin;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Admin: shuttle routes")
@RestController
@RequestMapping("/api/v1/admin/shuttle/routes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminShuttleController {

    private final AdminShuttleService adminShuttleService;

    @Operation(summary = "List shuttle routes")
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminRouteSummary> routes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return PageResponse.of(adminShuttleService.routes(page, size),
                Function.identity());
    }

    @Operation(summary = "Get one shuttle route with its stops, fares and schedules")
    @GetMapping("/{routeId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRouteResponse route(@PathVariable String routeId) {
        return adminShuttleService.route(routeId);
    }

    @Operation(summary = "Create a shuttle route")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "ROUTE_CREATED", targetType = "ROUTE")
    public AdminRouteResponse create(@Valid @RequestBody RouteRequest request) {
        return adminShuttleService.create(request);
    }

    @Operation(summary = "Update a shuttle route")
    @PutMapping("/{routeId}")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "ROUTE_UPDATED", targetType = "ROUTE")
    public AdminRouteResponse update(@PathVariable String routeId,
            @Valid @RequestBody RouteRequest request) {
        return adminShuttleService.update(routeId, request);
    }

    @Operation(summary = "Get a route's pass pricing")
    @GetMapping("/{routeId}/passes")
    @ResponseStatus(HttpStatus.OK)
    public PassPricingResponse passPricing(@PathVariable String routeId) {
        return adminShuttleService.passPricing(routeId);
    }

    @Operation(summary = "Set a route's pass pricing")
    @PutMapping("/{routeId}/passes")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "PASS_PRICING_CHANGED", targetType = "ROUTE")
    public PassPricingResponse setPassPricing(@PathVariable String routeId,
            @Valid @RequestBody PassPricingRequest request) {
        return adminShuttleService.setPassPricing(routeId, request);
    }

    /** The driver and vehicle a departure time normally runs with. */
    @Operation(summary = "Set the driver and vehicle a departure time normally runs with")
    @PutMapping("/{routeId}/schedules/{scheduleId}/crew")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "REGULAR_CREW_SET", targetType = "ROUTE")
    public AdminRouteResponse setRegularCrew(@PathVariable String routeId, @PathVariable String scheduleId,
            @Valid @RequestBody AssignDepartureRequest request) {
        return adminShuttleService.setRegularCrew(routeId, scheduleId, request);
    }

    @Operation(summary = "Clear a departure time's regular crew")
    @DeleteMapping("/{routeId}/schedules/{scheduleId}/crew")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "REGULAR_CREW_CLEARED", targetType = "ROUTE")
    public AdminRouteResponse clearRegularCrew(@PathVariable String routeId, @PathVariable String scheduleId) {
        return adminShuttleService.setRegularCrew(routeId, scheduleId, null);
    }

    /** The same route the other way, hidden until operations switches it on. */
    @Operation(summary = "Create the same route in the opposite direction")
    @PostMapping("/{routeId}/return")
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "ROUTE_CREATED", targetType = "ROUTE")
    public AdminRouteResponse createReturn(@PathVariable String routeId,
            @Valid @RequestBody ReturnRouteRequest request) {
        return adminShuttleService.createReturn(routeId, request);
    }

    @Operation(summary = "Delete a shuttle route")
    @DeleteMapping("/{routeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Audited(action = "ROUTE_DELETED", targetType = "ROUTE")
    public void deleteRoute(@PathVariable String routeId) {
        adminShuttleService.deleteRoute(routeId);
    }

    /** Appends, or inserts straight after the stop at position {@code after} (0 for the front). */
    @Operation(summary = "Add a stop to a route")
    @PostMapping("/{routeId}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "STOP_ADDED", targetType = "ROUTE")
    public AdminRouteResponse addStop(@PathVariable String routeId,
            @RequestParam(required = false) Integer after,
            @Valid @RequestBody StopRequest request) {
        return adminShuttleService.addStop(routeId, request, after);
    }

    @Operation(summary = "Update a stop")
    @PutMapping("/{routeId}/stops/{stopId}")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "STOP_UPDATED", targetType = "ROUTE")
    public AdminRouteResponse updateStop(@PathVariable String routeId, @PathVariable String stopId,
            @Valid @RequestBody StopRequest request) {
        return adminShuttleService.updateStop(routeId, stopId, request);
    }

    @Operation(summary = "Remove a stop from a route")
    @DeleteMapping("/{routeId}/stops/{stopId}")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "STOP_DELETED", targetType = "ROUTE")
    public AdminRouteResponse removeStop(@PathVariable String routeId, @PathVariable String stopId) {
        return adminShuttleService.removeStop(routeId, stopId);
    }

    @Operation(summary = "Set the fare between two stops")
    @PutMapping("/{routeId}/fares")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "FARE_SET", targetType = "ROUTE")
    public AdminRouteResponse setFare(@PathVariable String routeId,
            @Valid @RequestBody FareRequest request) {
        return adminShuttleService.setFare(routeId, request);
    }

    /** The whole table in one save. What is sent is what the route charges afterwards. */
    @Operation(summary = "Replace a route's whole fare table")
    @PutMapping("/{routeId}/fares/matrix")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "FARES_SET", targetType = "ROUTE")
    public AdminRouteResponse setFares(@PathVariable String routeId,
            @Valid @RequestBody FareMatrixRequest request) {
        return adminShuttleService.setFares(routeId, request);
    }

    @Operation(summary = "Remove a fare between two stops")
    @DeleteMapping("/{routeId}/fares/{fareId}")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "FARE_REMOVED", targetType = "ROUTE")
    public AdminRouteResponse removeFare(@PathVariable String routeId, @PathVariable String fareId) {
        return adminShuttleService.removeFare(routeId, fareId);
    }

    @Operation(summary = "Add a departure time to a route")
    @PostMapping("/{routeId}/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "DEPARTURE_ADDED", targetType = "ROUTE")
    public AdminRouteResponse addSchedule(@PathVariable String routeId,
            @Valid @RequestBody ScheduleRequest request) {
        return adminShuttleService.addSchedule(routeId, request);
    }

    @Operation(summary = "Update a departure time")
    @PutMapping("/{routeId}/schedules/{scheduleId}")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "DEPARTURE_UPDATED", targetType = "ROUTE")
    public AdminRouteResponse updateSchedule(@PathVariable String routeId,
            @PathVariable String scheduleId, @Valid @RequestBody ScheduleRequest request) {
        return adminShuttleService.updateSchedule(routeId, scheduleId, request);
    }

    /** Who is driving one dated departure. Until this runs, the seats are sold with no driver. */
    @Operation(summary = "Assign a driver and vehicle to one dated departure")
    @PostMapping("/schedules/{scheduleId}/departures/{serviceDate}/assign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Audited(action = "CREW_ASSIGNED", targetType = "SHUTTLE_SCHEDULE")
    public void assign(@PathVariable String scheduleId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate serviceDate,
            @Valid @RequestBody AssignDepartureRequest request) {
        adminShuttleService.assignDeparture(scheduleId, serviceDate, request);
    }
}
