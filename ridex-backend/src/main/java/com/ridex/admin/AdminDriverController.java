package com.ridex.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.driver.DriverOnboardingService;
import com.ridex.driver.dto.OnboardingResponse;
import com.ridex.driver.dto.ReviewDecisionRequest;
import com.ridex.platform.security.JwtPrincipal;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Driver review, for operations.
 *
 * <p>Support cannot reach any of this: approving a driver is an operational decision with money
 * behind it, and docs/07 keeps that apart from case handling on purpose.
 */
@RestController
@RequestMapping("/api/v1/admin/drivers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminDriverController {

    private final DriverOnboardingService driverOnboardingService;

    @GetMapping("/awaiting-review")
    @ResponseStatus(HttpStatus.OK)
    public List<OnboardingResponse> awaitingReview() {
        return driverOnboardingService.awaitingReview();
    }

    // No reason required to approve: the decision speaks for itself and the reviewer is recorded.
    @Audited(action = "DRIVER_APPROVED", targetType = "DRIVER")
    @PostMapping("/{driverId}/approve")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse approve(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId) {
        return driverOnboardingService.approve(driverId, principal.userId());
    }

    // A reason is mandatory here, and on suspend: somebody loses their income over this, and
    // "rejected" with no explanation is not something a person can appeal.
    @Audited(action = "DRIVER_REJECTED", targetType = "DRIVER")
    @PostMapping("/{driverId}/reject")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse reject(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId, @Valid @RequestBody ReviewDecisionRequest request) {
        return driverOnboardingService.reject(driverId, principal.userId(), request.reason());
    }

    @Audited(action = "DRIVER_SUSPENDED", targetType = "DRIVER")
    @PostMapping("/{driverId}/suspend")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse suspend(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId, @Valid @RequestBody ReviewDecisionRequest request) {
        return driverOnboardingService.suspend(driverId, principal.userId(), request.reason());
    }
}
