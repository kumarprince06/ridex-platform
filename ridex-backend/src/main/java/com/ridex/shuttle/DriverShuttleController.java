package com.ridex.shuttle;

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

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver/shuttle")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverShuttleController {

    private final DriverShuttleService driverShuttleService;

    /** What this driver is running, with each departure's manifest already on it. */
    @GetMapping("/departures")
    @ResponseStatus(HttpStatus.OK)
    public List<ManifestResponse> departures(@AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return driverShuttleService.departures(principal.userId(),
                date == null ? LocalDate.now() : date);
    }

    @GetMapping("/departures/{shuttleTripId}/manifest")
    @ResponseStatus(HttpStatus.OK)
    public ManifestResponse manifest(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId) {
        return driverShuttleService.manifest(principal.userId(), shuttleTripId);
    }

    /** Checks one passenger in. Returns the refreshed manifest, so the counts move with it. */
    @PostMapping("/departures/{shuttleTripId}/bookings/{bookingId}/board")
    @ResponseStatus(HttpStatus.OK)
    public ManifestResponse board(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String shuttleTripId, @PathVariable String bookingId,
            @Valid @RequestBody BoardPassengerRequest request) {
        return driverShuttleService.board(principal.userId(), shuttleTripId, bookingId,
                request.boardingCode());
    }
}
