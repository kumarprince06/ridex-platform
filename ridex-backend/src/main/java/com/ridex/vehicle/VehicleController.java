package com.ridex.vehicle;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.vehicle.dto.AddVehicleRequest;
import com.ridex.vehicle.dto.VehicleResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Vehicles")
@RestController
@RequestMapping("/api/v1/driver/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    private final VehicleService vehicleService;

    @Operation(summary = "List the driver's vehicles")
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<VehicleResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return vehicleService.mine(principal.userId());
    }

    /** Added as PENDING_REVIEW. Operations decides whether it may carry passengers. */
    @Operation(summary = "Add a vehicle for review")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleResponse add(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody AddVehicleRequest request) {
        return vehicleService.add(principal.userId(), request);
    }

    @Operation(summary = "Take a vehicle off the road")
    @PostMapping("/{vehicleId}/deactivate")
    @ResponseStatus(HttpStatus.OK)
    public VehicleResponse deactivate(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String vehicleId) {
        return vehicleService.deactivate(principal.userId(), vehicleId);
    }

    /** Puts a car the driver took off the road back on it, without a second review. */
    @Operation(summary = "Put a vehicle back on the road")
    @PostMapping("/{vehicleId}/reactivate")
    @ResponseStatus(HttpStatus.OK)
    public VehicleResponse reactivate(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String vehicleId) {
        return vehicleService.reactivate(principal.userId(), vehicleId);
    }
}
