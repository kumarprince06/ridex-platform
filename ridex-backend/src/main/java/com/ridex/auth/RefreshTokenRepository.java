package com.ridex.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.auth.domain.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Only ever consulted after findByTokenHash misses: a hit here means the secret was already
    // spent, so two parties are holding it.
    Optional<RefreshToken> findByPreviousTokenHash(String previousTokenHash);

    // Theft response. Revokes every live session for the account in one statement rather than
    // loading them, because the number of devices is not worth a round trip each.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now, t.updatedAt = :now "
            + "WHERE t.user.id = :userId AND t.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    // findByUserId/deleteByUserId are gone: a user now holds one row per device, so an Optional
    // return was a landmine. Session listing and revoke-all come back with the logout task.
}
