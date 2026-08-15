package com.ridex.infrastructure.persistence.jpa.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.tenant.Tenant;

// Business email lives on tenant_business_profiles (V10) — look tenants up via that repository.
public interface TenantRepository extends JpaRepository<Tenant, String> {
}
