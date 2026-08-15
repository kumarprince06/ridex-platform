package com.ridex.domain.tenant;

public record TenantContext(String userId, String tenantId, String role) {

    public static TenantContext of(String userId, String tenantId, String role) {
        return new TenantContext(userId, tenantId, role);
    }
}
