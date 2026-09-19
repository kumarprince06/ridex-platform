package com.ridex.wallet;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.wallet.dto.ConfirmTopUpRequest;
import com.ridex.wallet.dto.TopUpCheckout;
import com.ridex.wallet.dto.WalletResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver/wallet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverWalletController {

    private final DriverWalletService walletService;

    /** The balance, the limit below which offers stop, and what clearing it would take. */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public WalletResponse wallet(@AuthenticationPrincipal JwtPrincipal principal) {
        return walletService.walletFor(principal.userId());
    }

    /** Opens checkout for everything owed. A repeated Idempotency-Key returns the same checkout. */
    @PostMapping("/top-ups")
    @ResponseStatus(HttpStatus.CREATED)
    public TopUpCheckout startTopUp(@AuthenticationPrincipal JwtPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey) {
        return walletService.startTopUp(principal.userId(), idempotencyKey);
    }

    /** Called after checkout closes; the gateway is asked whether the money arrived. */
    @PostMapping("/top-ups/{topUpId}/confirm")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponse confirmTopUp(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String topUpId, @Valid @RequestBody ConfirmTopUpRequest request) {
        return walletService.confirmTopUp(principal.userId(), topUpId, request.gatewayPaymentId());
    }
}
