package com.ridex.shuttle;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shuttle.dto.BoardPassengerRequest;
import com.ridex.shuttle.dto.ManifestResponse;
import com.ridex.shuttle.dto.ShuttleLiveResponse;
import com.ridex.shuttle.dto.ShuttleLocationRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Shuttle (driver)")
@RestController
@RequestMapping("/api/v1/driver/shuttle")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverShuttleController {

    private final DriverShuttleService driverShuttleService;
    private final ShuttleRunService shuttleRunService;

    /** What this driver is running, with each departure's manifest already on it. */
    @Operation(summary = "List the driver's shuttle departures with manifests")
    @GetMapping("/departures")
    @ResponseStatus(HttpStatus.OK)
    public List<ManifestResponse> departures(@AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return driverShuttleService.departures(principal.userId(),
                date == null ? LocalDate.now() : date);
    }

    @Operation(summary = "Get a departure's passenger manifest")
    @GetMapping("/departures/{shuttleTripId}/manifest")
    @ResponseStatus(HttpStatus.OK)
    public ManifestResponse manifest(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId) {
        return driverShuttleService.manifest(principal.userId(), shuttleTripId);
    }

    /** Checks one passenger in. Returns the refreshed manifest, so the counts move with it. */
    @Operation(summary = "Board one passenger")
    @PostMapping("/departures/{shuttleTripId}/bookings/{bookingId}/board")
    @ResponseStatus(HttpStatus.OK)
    public ManifestResponse board(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId, @PathVariable String bookingId,
            @Valid @RequestBody BoardPassengerRequest request) {
        return driverShuttleService.board(principal.userId(), shuttleTripId, bookingId,
                request.boardingCode());
    }

    @Operation(summary = "Get a departure's live position and stop progress")
    @GetMapping("/departures/{shuttleTripId}/live")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleLiveResponse live(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId) {
        return shuttleRunService.forDriver(principal.userId(), shuttleTripId);
    }

    @Operation(summary = "Start a shuttle departure")
    @PostMapping("/departures/{shuttleTripId}/start")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleLiveResponse start(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId) {
        return shuttleRunService.start(principal.userId(), shuttleTripId);
    }

    /** GPS ping while the run is on. Reaching a stop is detected from these. */
    @Operation(summary = "Report the shuttle's position during a run")
    @PostMapping("/departures/{shuttleTripId}/location")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleLiveResponse location(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId, @Valid @RequestBody ShuttleLocationRequest request) {
        return shuttleRunService.reportPosition(principal.userId(), shuttleTripId,
                request.latitude(), request.longitude(), request.heading());
    }

    /** Manual backup for when GPS misses a stop. */
    @Operation(summary = "Mark arrival at a stop by hand")
    @PostMapping("/departures/{shuttleTripId}/stops/{stopId}/arrive")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleLiveResponse arrive(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId, @PathVariable String stopId) {
        return shuttleRunService.arrive(principal.userId(), shuttleTripId, stopId);
    }

    @Operation(summary = "Finish a shuttle departure")
    @PostMapping("/departures/{shuttleTripId}/finish")
    @ResponseStatus(HttpStatus.OK)
    public ShuttleLiveResponse finish(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId) {
        return shuttleRunService.finish(principal.userId(), shuttleTripId);
    }
}
