package com.ridex.driver;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {

    Optional<DriverProfile> findByUserId(String userId);

    List<DriverProfile> findByOnboardingStatusOrderByCreatedAtAsc(DriverOnboardingStatus status);

    long countByOnboardingStatus(DriverOnboardingStatus status);

    long countByOnDutyTrue();

    @Query("SELECT p FROM DriverProfile p WHERE (:status IS NULL OR p.onboardingStatus = :status) "
            + "AND (:term IS NULL OR :term = '' "
            + "OR LOWER(p.user.email) LIKE LOWER(CONCAT('%', :term, '%')) "
            + "OR LOWER(COALESCE(p.user.firstName, '')) LIKE LOWER(CONCAT('%', :term, '%')))")
    Page<DriverProfile> search(@Param("status") DriverOnboardingStatus status,
            @Param("term") String term, Pageable pageable);
}
