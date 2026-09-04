package com.ridex.rider;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.rider.dto.RiderProfileResponse;
import com.ridex.rider.dto.UpdateRiderProfileRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/rider")
@RequiredArgsConstructor
// The account must actually hold the role, not merely have signed in from the rider app - the app
// context is a blast-radius control, not the authorization decision.
@PreAuthorize("hasRole('RIDER')")
public class RiderController {

    private final RiderProfileService riderProfileService;

    @GetMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public RiderProfileResponse getProfile(@AuthenticationPrincipal JwtPrincipal principal) {
        return riderProfileService.get(principal.userId());
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public RiderProfileResponse updateProfile(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody UpdateRiderProfileRequest request) {
        return riderProfileService.update(principal.userId(), request);
    }
}
