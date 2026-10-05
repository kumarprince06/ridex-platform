package com.ridex.admin;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.pricing.RideFareService;
import com.ridex.pricing.dto.RideTypeFareRequest;
import com.ridex.pricing.dto.RideTypeFareResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Admin: ride fares")
@RestController
@RequestMapping("/api/v1/admin/ride-fares")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminPricingController {

    private final RideFareService rideFareService;

    @Operation(summary = "List the fare rules for every ride type")
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<RideTypeFareResponse> all() {
        return rideFareService.all();
    }

    @Audited(action = "RIDE_FARE_CHANGED", targetType = "RIDE_TYPE")
    @Operation(summary = "Change a ride type's fares")
    @PutMapping("/{rideTypeId}")
    @ResponseStatus(HttpStatus.OK)
    public RideTypeFareResponse change(@PathVariable String rideTypeId, @Valid @RequestBody RideTypeFareRequest request) {
        return rideFareService.change(rideTypeId, request);
    }
}
