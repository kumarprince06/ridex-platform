package com.ridex.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.PageResponse;
import com.ridex.wallet.AdminWalletQueries;
import com.ridex.wallet.dto.AdminWalletResponse;
import com.ridex.wallet.dto.WalletEntryResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/wallets")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminWalletController {

    private final AdminWalletQueries wallets;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminWalletResponse> wallets(@RequestParam(defaultValue = "ALL") String filter,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        return wallets.wallets(filter, q, page, size);
    }

    @GetMapping("/{driverId}/entries")
    @ResponseStatus(HttpStatus.OK)
    public List<WalletEntryResponse> entries(@PathVariable String driverId) {
        return wallets.entries(driverId);
    }
}
