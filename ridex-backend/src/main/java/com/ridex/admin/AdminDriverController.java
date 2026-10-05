package com.ridex.admin;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import com.ridex.driver.DriverDocumentService;
import com.ridex.driver.DriverOnboardingService;
import com.ridex.driver.dto.DriverDocumentResponse;
import com.ridex.driver.dto.OnboardingResponse;
import com.ridex.driver.dto.ReviewDecisionRequest;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.vehicle.VehicleService;
import com.ridex.vehicle.dto.VehicleResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Driver review, for operations.
 *
 * <p>Support cannot reach any of this: approving a driver is an operational decision with money
 * behind it, and docs/07 keeps that apart from case handling on purpose.
 */
@Tag(name = "Admin: drivers")
@RestController
@RequestMapping("/api/v1/admin/drivers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminDriverController {

    private final DriverOnboardingService driverOnboardingService;
    private final DriverDocumentService driverDocumentService;
    private final VehicleService vehicleService;

    @Operation(summary = "List drivers waiting for an onboarding decision")
    @GetMapping("/awaiting-review")
    @ResponseStatus(HttpStatus.OK)
    public List<OnboardingResponse> awaitingReview() {
        return driverOnboardingService.awaitingReview();
    }

    // No reason required to approve: the decision speaks for itself and the reviewer is recorded.
    @Audited(action = "DRIVER_APPROVED", targetType = "DRIVER")
    @Operation(summary = "Approve a driver to drive")
    @PostMapping("/{driverId}/approve")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse approve(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId) {
        return driverOnboardingService.approve(driverId, principal.userId());
    }

    // A reason is mandatory here, and on suspend: somebody loses their income over this, and
    // "rejected" with no explanation is not something a person can appeal.
    @Audited(action = "DRIVER_REJECTED", targetType = "DRIVER")
    @Operation(summary = "Reject a driver's onboarding, with a reason")
    @PostMapping("/{driverId}/reject")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse reject(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId, @Valid @RequestBody ReviewDecisionRequest request) {
        return driverOnboardingService.reject(driverId, principal.userId(), request.reason());
    }

    @Audited(action = "DRIVER_SUSPENDED", targetType = "DRIVER")
    @Operation(summary = "Suspend a driver, with a reason")
    @PostMapping("/{driverId}/suspend")
    @ResponseStatus(HttpStatus.OK)
    public OnboardingResponse suspend(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String driverId, @Valid @RequestBody ReviewDecisionRequest request) {
        return driverOnboardingService.suspend(driverId, principal.userId(), request.reason());
    }

    /* ---------------------------------------------------------------- documents and vehicles */

    @Operation(summary = "List driver documents waiting for review")
    @GetMapping("/documents/awaiting-review")
    @ResponseStatus(HttpStatus.OK)
    public List<DriverDocumentResponse> documentsAwaitingReview() {
        return driverDocumentService.awaitingReview();
    }

    @Operation(summary = "List one driver's documents")
    @GetMapping("/{driverId}/documents")
    @ResponseStatus(HttpStatus.OK)
    public List<DriverDocumentResponse> documents(@PathVariable String driverId) {
        return driverDocumentService.forDriver(driverId);
    }

    /**
     * The file itself, streamed through the application.
     *
     * <p>Never a redirect to storage: a signed URL that leaks is a KYC document anybody can read
     * until it expires, and docs/14 does not allow that.
     */
    @Operation(summary = "Stream a driver document's file")
    @GetMapping("/documents/{documentId}/file")
    public ResponseEntity<byte[]> documentFile(@PathVariable String documentId) {
        return ResponseEntity.ok()
                // inline would let a browser render it; attachment keeps it off the screen of
                // whoever is shoulder-surfing an operations desk.
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(driverDocumentService.contents(documentId));
    }

    @Operation(summary = "Approve a driver document")
    @PostMapping("/documents/{documentId}/approve")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "DOCUMENT_APPROVED", targetType = "DRIVER")
    public DriverDocumentResponse approveDocument(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String documentId) {
        return driverDocumentService.review(documentId, principal.userId(), true, null);
    }

    @Operation(summary = "Reject a driver document, with a reason")
    @PostMapping("/documents/{documentId}/reject")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "DOCUMENT_REJECTED", targetType = "DRIVER")
    public DriverDocumentResponse rejectDocument(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String documentId, @Valid @RequestBody ReviewDecisionRequest request) {
        return driverDocumentService.review(documentId, principal.userId(), false, request.reason());
    }

    @Operation(summary = "List one driver's vehicles")
    @GetMapping("/{driverId}/vehicles")
    @ResponseStatus(HttpStatus.OK)
    public List<VehicleResponse> vehicles(@PathVariable String driverId) {
        return vehicleService.forDriver(driverId);
    }

    @Operation(summary = "Approve a vehicle to carry passengers")
    @PostMapping("/vehicles/{vehicleId}/approve")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "VEHICLE_APPROVED", targetType = "DRIVER")
    public VehicleResponse approveVehicle(@PathVariable String vehicleId) {
        return vehicleService.review(vehicleId, true);
    }

    @Operation(summary = "Reject a vehicle")
    @PostMapping("/vehicles/{vehicleId}/reject")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "VEHICLE_REJECTED", targetType = "DRIVER")
    public VehicleResponse rejectVehicle(@PathVariable String vehicleId) {
        return vehicleService.review(vehicleId, false);
    }
}
