package com.ridex.rider;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.rider.domain.RiderProfile;

public interface RiderProfileRepository extends JpaRepository<RiderProfile, String> {

    Optional<RiderProfile> findByUserId(String userId);
}
