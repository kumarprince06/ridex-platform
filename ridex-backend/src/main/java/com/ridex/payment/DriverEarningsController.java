package com.ridex.payment;

import java.util.Currency;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.driver.DriverProfileRepository;
import java.util.List;

import com.ridex.payment.dto.EarningsResponse;
import com.ridex.payment.dto.PayoutResponse;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * What a driver has earned, as lines they can check.
 *
 * <p>Gross, the rate that applied, the commission and the net - per trip. A driver who cannot
 * reconstruct their payout from their own trips has to take the platform's word for it, and that
 * is the single most common complaint on every competing platform.
 */
@RestController
@RequestMapping("/api/v1/driver/earnings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverEarningsController {

    private final PaymentService paymentService;
    private final PayoutService payoutService;
    private final DriverProfileRepository driverProfileRepository;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public EarningsResponse earnings(@AuthenticationPrincipal JwtPrincipal principal) {
        String driverProfileId = driverProfileRepository.findByUserId(principal.userId())
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();

        return paymentService.earningsFor(driverProfileId, Currency.getInstance("INR"));
    }

    /** What has actually been paid out, against what the earnings above say is owed. */
    @GetMapping("/payouts")
    @ResponseStatus(HttpStatus.OK)
    public List<PayoutResponse> payouts(@AuthenticationPrincipal JwtPrincipal principal) {
        return payoutService.mine(principal.userId());
    }
}
