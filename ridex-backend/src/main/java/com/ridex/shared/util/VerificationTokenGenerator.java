package com.ridex.shared.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Raw tokens are generated once, handed to the email, and never stored. Only {@link #hash(String)}
 * output reaches the database, so a leaked row cannot be replayed against the verify endpoint.
 *
 * <p>The hash is SHA-256 rather than BCrypt on purpose. A token is 256 bits of SecureRandom, so
 * there is nothing to brute force and no need for a slow algorithm - but the digest must be
 * deterministic, because verification looks the token up by hash. A salted hash would make that
 * lookup impossible.
 */
public final class VerificationTokenGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private VerificationTokenGenerator() {
        // Static utility, mirrors UlidGenerator.
    }

    /** URL-safe raw token, suitable for a verification link. Never persist this value. */
    public static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** 64-character hex SHA-256 digest - the only form of a token that may be stored or logged. */
    public static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is required of every JVM, so this cannot happen on a sane runtime.
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

}
