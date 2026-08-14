package com.ridex.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.entity.Tenant;

public interface TenantRepository extends JpaRepository<Tenant, String> {

    Optional<Tenant> findByBusinessEmail(String businessEmail);

    boolean existsByBusinessEmail(String businessEmail);
    
}
