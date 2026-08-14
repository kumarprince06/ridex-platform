package com.ridex.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.entity.Tenant;

// Business email lives on tenant_business_profiles (V10) — look tenants up via that repository.
public interface TenantRepository extends JpaRepository<Tenant, String> {
}
