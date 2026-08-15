package com.ridex.application.tenant;

import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantContext;
import com.ridex.domain.tenant.TenantLifecycleStatus;
import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.security.TenantContextHolder;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TenantAccessService {

    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;

    public void requireTenantAccess(String requestedTenantId) {
        TenantContext tenantContext = TenantContextHolder.getRequired();
        if (TenantUserRole.SUPER_ADMIN.name().equals(tenantContext.role())) {
            return;
        }

        if (!Objects.equals(requestedTenantId, tenantContext.tenantId())) {
            throw new AccessDeniedException("Tenant context does not match the requested tenant.");
        }

        TenantUser membership = tenantUserRepository.findByTenantIdAndUserId(requestedTenantId, tenantContext.userId())
                .orElseThrow(() -> new AccessDeniedException("User is not a member of the requested tenant."));

        if (membership.getStatus() != TenantUserStatus.ACTIVE) {
            throw new AccessDeniedException("User membership is not active for this tenant.");
        }

        Tenant tenant = tenantRepository.findById(requestedTenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + requestedTenantId));

        if (tenant.getLifecycleStatus() != TenantLifecycleStatus.ACTIVE) {
            throw new AccessDeniedException("Tenant is not active and cannot serve operational requests.");
        }
    }

    public void requireActiveTenantMembership(String tenantId, String userId) {
        TenantUser membership = tenantUserRepository.findByTenantIdAndUserId(tenantId, userId)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of the requested tenant."));

        if (membership.getStatus() != TenantUserStatus.ACTIVE) {
            throw new AccessDeniedException("User membership is not active for this tenant.");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        if (tenant.getLifecycleStatus() != TenantLifecycleStatus.ACTIVE) {
            throw new AccessDeniedException("Tenant is not active and cannot serve operational requests.");
        }
    }
}
