package com.ridex.driver;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    List<DriverProfile> findByOnboardingStatusOrderByCreatedAtAsc(DriverOnboardingStatus status);
}
