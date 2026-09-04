package com.ridex.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.auth.domain.UserToken;

public interface UserTokenRepository extends JpaRepository<UserToken, String> {

    // Lookup is by hash, never by raw token - that is why the digest is deterministic (SHA-256)
    // rather than salted, and why uk_user_tokens_token_hash exists.
    Optional<UserToken> findByTokenHash(String tokenHash);
}
