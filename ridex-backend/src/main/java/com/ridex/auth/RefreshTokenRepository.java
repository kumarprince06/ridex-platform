package com.ridex.auth;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.auth.domain.RefreshToken;

import jakarta.persistence.LockModeType;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Refresh only. Two requests rotating one row at once would each mint a secret and the slower
    // commit would silently kill the other; the lock makes the second wait and see it as spent.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    // Only ever consulted after findByTokenHash misses: a hit here means the secret was already
    // spent, so two parties are holding it.
    Optional<RefreshToken> findByPreviousTokenHash(String previousTokenHash);

    List<RefreshToken> findByUserIdAndRevokedAtIsNullOrderByLastUsedAtDesc(String userId);

    // Housekeeping: rows accumulate one per device login and nothing else removes them.
    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    // Theft response. Revokes every live session for the account in one statement rather than
    // loading them, because the number of devices is not worth a round trip each.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now, t.updatedAt = :now "
            + "WHERE t.user.id = :userId AND t.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    // findByUserId/deleteByUserId are gone: a user now holds one row per device, so an Optional
    // return was a landmine. Session listing and revoke-all come back with the logout task.
}
