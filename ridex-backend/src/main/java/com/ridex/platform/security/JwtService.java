package com.ridex.platform.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_APP = "app";
    public static final String CLAIM_TOKEN_TYPE = "tokenType";

    public static final String TOKEN_TYPE_ACCESS = "access";
    // Refresh tokens are opaque random values, not JWTs. This constant stays so the filter can
    // still reject any legacy or forged JWT that claims to be one.
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    // HMAC-SHA256 is only as strong as its key length.
    private static final int MINIMUM_SECRET_BYTES = 32;

    // The old default. It is in git history, so anyone reading the repo could forge admin tokens.
    private static final String REJECTED_SECRET = "change-me-please-very-long-secret-key";

    private final SecretKey signingKey;
    private final long accessExpirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-expiration-ms:900000}") long accessExpirationMs) {
        requireStrongSecret(secret);
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMs = accessExpirationMs;
    }

    // Refuses to start rather than issue forgeable tokens.
    private static void requireStrongSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "RIDEX_JWT_SECRET is not set. Generate one with: openssl rand -base64 48");
        }
        if (REJECTED_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "RIDEX_JWT_SECRET is the placeholder from the repository. Generate a real one.");
        }
        int bytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < MINIMUM_SECRET_BYTES) {
            throw new IllegalStateException(
                    "RIDEX_JWT_SECRET must be at least " + MINIMUM_SECRET_BYTES
                            + " bytes for HMAC-SHA256; got " + bytes + ".");
        }
    }

    public String generateAccessToken(String userId, String email, Set<UserRole> roles, AppContext app) {
        return buildToken(userId, email, roles, app, accessExpirationMs, TOKEN_TYPE_ACCESS);
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // Package-private, not private: the filter test needs to mint a non-access token to prove
    // such a token is rejected, and no production caller should be able to.
    String buildToken(String userId, String email, Set<UserRole> roles, AppContext app,
            long expirationMs, String tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        // Only the roles this surface may act with, not everything the account holds - see
        // AppContext. Sorted so a token is reproducible for a given input.
        List<String> roleNames = roles.stream().map(UserRole::name).sorted().toList();

        return Jwts.builder()
                .claims(Map.of(
                        "sub", userId,
                        CLAIM_EMAIL, email,
                        CLAIM_ROLES, roleNames,
                        CLAIM_APP, app.name(),
                        CLAIM_TOKEN_TYPE, tokenType))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }
}
