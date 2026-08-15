package com.ridex.infrastructure.security;

import com.ridex.domain.tenant.TenantContext;

public final class TenantContextHolder {

    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void set(TenantContext tenantContext) {
        CONTEXT.set(tenantContext);
    }

    public static TenantContext get() {
        return CONTEXT.get();
    }

    public static TenantContext getRequired() {
        TenantContext context = CONTEXT.get();
        if (context == null) {
            throw new IllegalStateException("Tenant context is not available for the current request.");
        }
        return context;
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
