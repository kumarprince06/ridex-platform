package com.ridex.points;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.points.dto.ApplyReferralRequest;
import com.ridex.points.dto.PointsBalanceResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * The rider's points wallet.
 *
 * <p>Not restricted to RIDER: a driver earns and redeems on their own rides too, and points belong
 * to the account rather than to a role.
 */
@Tag(name = "Points")
@RestController
@RequestMapping("/api/v1/points")
@RequiredArgsConstructor
public class PointsController {

    private final PointsService pointsService;

    @Operation(summary = "Get the points balance, its value and the referral code")
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PointsBalanceResponse balance(@AuthenticationPrincipal JwtPrincipal principal) {
        return pointsService.balance(principal.userId());
    }

    // Records who referred whom. Nothing is awarded until the referee actually takes a ride.
    @Operation(summary = "Apply a referral code")
    @PostMapping("/referral")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void applyReferral(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody ApplyReferralRequest request) {
        pointsService.applyReferralCode(principal.userId(), request.code());
    }
}
