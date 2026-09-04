package com.ridex.points;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.points.domain.Referral;
import com.ridex.points.domain.ReferralStatus;

public interface ReferralRepository extends JpaRepository<Referral, String> {

    Optional<Referral> findByRefereeUserId(String refereeUserId);

    List<Referral> findByReferrerUserIdOrderByCreatedAtDesc(String referrerUserId);

    long countByReferrerUserIdAndStatus(String referrerUserId, ReferralStatus status);
}
