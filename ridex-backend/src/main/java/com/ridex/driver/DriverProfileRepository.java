package com.ridex.driver;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.driver.domain.DriverProfile;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);
}
