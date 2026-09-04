package com.ridex.driver;

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
import com.ridex.driver.dto.DriverProfileResponse;
import com.ridex.driver.dto.UpdateDriverProfileRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver")
@RequiredArgsConstructor
// The account must actually hold the role, not merely have signed in from the driver app - the app
// context is a blast-radius control, not the authorization decision.
@PreAuthorize("hasRole('DRIVER')")
public class DriverController {

    private final DriverProfileService driverProfileService;

    @GetMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public DriverProfileResponse getProfile(@AuthenticationPrincipal JwtPrincipal principal) {
        return driverProfileService.get(principal.userId());
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.OK)
    public DriverProfileResponse updateProfile(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody UpdateDriverProfileRequest request) {
        return driverProfileService.update(principal.userId(), request);
    }
}
