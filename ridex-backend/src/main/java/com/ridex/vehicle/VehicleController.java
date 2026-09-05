package com.ridex.vehicle;

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

@RestController
@RequestMapping("/api/v1/driver/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<VehicleResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return vehicleService.mine(principal.userId());
    }

    /** Added as PENDING_REVIEW. Operations decides whether it may carry passengers. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleResponse add(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody AddVehicleRequest request) {
        return vehicleService.add(principal.userId(), request);
    }

    @PostMapping("/{vehicleId}/deactivate")
    @ResponseStatus(HttpStatus.OK)
    public VehicleResponse deactivate(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String vehicleId) {
        return vehicleService.deactivate(principal.userId(), vehicleId);
    }
}
