package com.ridex.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.PageResponse;
import com.ridex.shuttle.AdminShuttleService;
import com.ridex.shuttle.dto.AdminPassResponse;
import com.ridex.shuttle.dto.RoutePassSummary;

import lombok.RequiredArgsConstructor;

/** Passes across every route: where each route stands, and every pass sold. Prices live on the route. */
@RestController
@RequestMapping("/api/v1/admin/shuttle/passes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminPassController {

    private final AdminShuttleService adminShuttleService;

    @GetMapping("/overview")
    @ResponseStatus(HttpStatus.OK)
    public List<RoutePassSummary> overview() {
        return adminShuttleService.passOverview();
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<AdminPassResponse> sold(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminShuttleService.soldPasses(page, size);
    }
}
