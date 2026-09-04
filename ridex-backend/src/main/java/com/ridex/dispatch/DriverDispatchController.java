package com.ridex.dispatch;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.dispatch.dto.DutyRequest;
import com.ridex.dispatch.dto.LocationRequest;
import com.ridex.dispatch.dto.OfferResponse;
import com.ridex.platform.security.JwtPrincipal;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverDispatchController {

    private final DispatchService dispatchService;
    private final DriverDutyService driverDutyService;

    @PutMapping("/duty")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setDuty(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody DutyRequest request) {
        driverDutyService.setDuty(principal.userId(), request);
    }

    // Called every few seconds while on duty. Goes to Redis, never to Postgres.
    @PostMapping("/location")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportLocation(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody LocationRequest request) {
        driverDutyService.reportLocation(principal.userId(), request);
    }

    /** What the app asks for on reconnect. A socket that dropped must not lose a ride. */
    @GetMapping("/offers")
    @ResponseStatus(HttpStatus.OK)
    public List<OfferResponse> offers(@AuthenticationPrincipal JwtPrincipal principal) {
        return dispatchService.liveOffers(principal.userId());
    }

    @PostMapping("/offers/{offerId}/accept")
    @ResponseStatus(HttpStatus.OK)
    public OfferResponse accept(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String offerId) {
        return dispatchService.accept(principal.userId(), offerId);
    }

    @PostMapping("/offers/{offerId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String offerId) {
        dispatchService.reject(principal.userId(), offerId);
    }
}
