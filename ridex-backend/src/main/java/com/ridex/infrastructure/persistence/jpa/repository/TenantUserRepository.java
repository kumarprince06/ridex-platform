package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.tenant.TenantUser;

public interface TenantUserRepository extends JpaRepository<TenantUser, String> {
    // Custom query methods can be defined here if needed

    Optional<TenantUser> findByTenantIdAndUserId(String tenantId, String userId);

    boolean existsByTenantIdAndUserId(String tenantId, String userId);
    
}
