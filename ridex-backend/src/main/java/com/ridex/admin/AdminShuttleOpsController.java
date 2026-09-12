package com.ridex.admin;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.admin.dto.AdminDepartureResponse;
import com.ridex.shuttle.AdminShuttleService;

import lombok.RequiredArgsConstructor;

/**
 * Departures as they are running, rather than the routes they were planned from.
 *
 * <p>Separate from the routes controller because it answers a different question: not "what do we
 * run" but "who is on the 08:15 tomorrow, and who is driving it".
 */
@RestController
@RequestMapping("/api/v1/admin/shuttle/departures")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminShuttleOpsController {

    private final AdminShuttleService adminShuttleService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<AdminDepartureResponse> departures(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return adminShuttleService.departures(date);
    }

    @GetMapping("/{shuttleTripId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminDepartureResponse departure(@PathVariable String shuttleTripId) {
        return adminShuttleService.departure(shuttleTripId);
    }
}
