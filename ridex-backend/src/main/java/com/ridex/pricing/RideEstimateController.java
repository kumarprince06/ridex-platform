package com.ridex.pricing;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.pricing.dto.EstimateOptionResponse;
import com.ridex.pricing.dto.EstimateRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "Rides")
@RestController
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
public class RideEstimateController {

    private final FareEstimateService fareEstimateService;

    // POST, not GET: each call stores a quote the rider can later be held to, so it is not the
    // safe, repeatable read that GET promises.
    @Operation(summary = "Quote every ride type for a pickup and destination")
    @PostMapping("/estimate")
    @ResponseStatus(HttpStatus.OK)
    public List<EstimateOptionResponse> estimate(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody EstimateRequest request) {
        return fareEstimateService.estimate(principal.userId(), request);
    }
}
