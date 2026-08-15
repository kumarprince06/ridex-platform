package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.business.TenantBusinessProfile;

public interface TenantBusinessProfileRepository extends JpaRepository<TenantBusinessProfile, String> {

    Optional<TenantBusinessProfile> findByBusinessEmail(String businessEmail);

    boolean existsByBusinessEmail(String businessEmail);

    Optional<TenantBusinessProfile> findByTenantId(String tenantId);

}
