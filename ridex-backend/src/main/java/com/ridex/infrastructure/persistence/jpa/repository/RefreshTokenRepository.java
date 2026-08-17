package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.user.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // findByUserId/deleteByUserId are gone: a user now holds one row per device, so an Optional
    // return was a landmine. Session listing and revoke-all come back with the logout task.
}
