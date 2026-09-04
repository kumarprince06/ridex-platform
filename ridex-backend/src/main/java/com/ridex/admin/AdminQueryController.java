package com.ridex.admin;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.*;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.ride.domain.RideStatus;

import lombok.RequiredArgsConstructor;

/**
 * Read-only operations views.
 *
 * <p>Support can read people and trips, because that is what a case needs. It cannot approve a
 * driver or move money - docs/07 keeps case handling and financial authority apart, and one person
 * holding both is the standard internal-fraud pattern in a marketplace.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPPORT', 'OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminQueryController {

    private final AdminQueryService adminQueryService;

    @GetMapping("/dashboard")
    @ResponseStatus(HttpStatus.OK)
    public DashboardResponse dashboard() {
        return adminQueryService.dashboard();
    }

    @GetMapping("/riders")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminRiderResponse> riders(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminQueryService.riders(q, page, size);
    }

    @GetMapping("/drivers")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminDriverResponse> drivers(
            @RequestParam(required = false) DriverOnboardingStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminQueryService.drivers(status, q, page, size);
    }

    @GetMapping("/trips")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminTripResponse> trips(
            @RequestParam(required = false) RideStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminQueryService.trips(status, page, size);
    }

    // Super admin only: the audit log records what everyone else did, so it is not something an
    // ordinary operator should be reading over.
    @GetMapping("/audit")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AuditLogResponse> auditLog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return adminQueryService.auditLog(page, size);
    }
}
