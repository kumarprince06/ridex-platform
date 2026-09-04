package com.ridex.rider;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.rider.domain.RiderProfile;

public interface RiderProfileRepository extends JpaRepository<RiderProfile, String> {

    Optional<RiderProfile> findByUserId(String userId);

    // Search is on the account, since that is where the email and name live.
    @Query("SELECT p FROM RiderProfile p WHERE :term IS NULL OR :term = '' "
            + "OR LOWER(p.user.email) LIKE LOWER(CONCAT('%', :term, '%')) "
            + "OR LOWER(COALESCE(p.user.firstName, '')) LIKE LOWER(CONCAT('%', :term, '%')) "
            + "OR LOWER(COALESCE(p.user.lastName, '')) LIKE LOWER(CONCAT('%', :term, '%'))")
    Page<RiderProfile> search(@Param("term") String term, Pageable pageable);
}
