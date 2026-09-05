package com.ridex.driver;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.driver.domain.DriverDocument;
import com.ridex.driver.domain.DriverDocumentStatus;
import com.ridex.driver.domain.DriverDocumentType;

public interface DriverDocumentRepository extends JpaRepository<DriverDocument, String> {

    List<DriverDocument> findByDriverIdOrderByCreatedAtDesc(String driverId);

    Optional<DriverDocument> findByDriverIdAndDocumentType(String driverId, DriverDocumentType type);

    List<DriverDocument> findByStatusOrderByCreatedAtAsc(DriverDocumentStatus status);

    /**
     * Approved documents whose expiry has passed. The sweep flips these to EXPIRED, which is what
     * an eligibility check reads - an approved licence that lapsed last month is not valid today.
     */
    @Query("""
            SELECT d FROM DriverDocument d
            WHERE d.status = com.ridex.driver.domain.DriverDocumentStatus.APPROVED
              AND d.expiresAt IS NOT NULL
              AND d.expiresAt <= :now
            """)
    List<DriverDocument> findLapsed(@Param("now") Instant now);
}
