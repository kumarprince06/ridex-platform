package com.ridex.api.controller.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.tenant.CreateTenantRequest;
import com.ridex.api.dto.tenant.TenantResponse;
import com.ridex.application.tenant.TenantOnboardingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantOnboardingService tenantOnboardingService;

    @PostMapping("/{tenantId}/complete-onboarding")
    @ResponseStatus(HttpStatus.OK)
    public TenantResponse completeOnboarding(
            @PathVariable String tenantId,
            @Valid @RequestBody CreateTenantRequest request) {
        return tenantOnboardingService.completeOnboarding(tenantId, request);
    }
}
