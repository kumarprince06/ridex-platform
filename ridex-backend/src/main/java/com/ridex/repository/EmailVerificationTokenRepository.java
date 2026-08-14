package com.ridex.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.entity.EmailVerificationToken;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {

    // Lookup is by hash, never by raw token - that is why the hash is deterministic (SHA-256)
    // rather than salted, and why uk_email_verification_token exists.
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

}
