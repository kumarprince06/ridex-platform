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

    @GetMapping("/analytics")
    @ResponseStatus(HttpStatus.OK)
    public AnalyticsResponse analytics(@RequestParam(defaultValue = "14") int days) {
        return adminQueryService.analytics(days);
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

    /** The live map: who is on duty, where, and whether they are carrying somebody. */
    @GetMapping("/drivers/live")
    @ResponseStatus(HttpStatus.OK)
    public java.util.List<LiveDriverResponse> liveDrivers() {
        return adminQueryService.liveDrivers();
    }

    @GetMapping("/drivers/{driverId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminDriverResponse driver(@org.springframework.web.bind.annotation.PathVariable String driverId) {
        return adminQueryService.driver(driverId);
    }

    @GetMapping("/payments/{paymentId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminPaymentDetailResponse payment(
            @org.springframework.web.bind.annotation.PathVariable String paymentId) {
        return adminQueryService.payment(paymentId);
    }

    @GetMapping("/trips/{rideId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminTripDetailResponse trip(
            @org.springframework.web.bind.annotation.PathVariable String rideId) {
        return adminQueryService.trip(rideId);
    }

    @GetMapping("/riders/{riderId}")
    @ResponseStatus(HttpStatus.OK)
    public AdminRiderDetailResponse rider(
            @org.springframework.web.bind.annotation.PathVariable String riderId) {
        return adminQueryService.rider(riderId);
    }

    @GetMapping("/trips")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminTripResponse> trips(
            @RequestParam(required = false) RideStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminQueryService.trips(status, page, size);
    }

    // Finance and operations see money; support does not. One person holding both case handling
    // and financial authority is the standard internal-fraud pattern in a marketplace.
    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminPaymentResponse> payments(
            @RequestParam(required = false) com.ridex.payment.domain.PaymentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminQueryService.payments(status, page, size);
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
