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
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey signingKey;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtService(@Value("${app.jwt.secret:change-me-please-very-long-secret-key}") String secret,
            @Value("${app.jwt.access-expiration-ms:3600000}") long accessExpirationMs,
            @Value("${app.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public String generateAccessToken(String userId, String email, Set<UserRole> roles, AppContext app) {
        return buildToken(userId, email, roles, app, accessExpirationMs, TOKEN_TYPE_ACCESS);
    }

    public String generateRefreshToken(String userId, String email, Set<UserRole> roles, AppContext app) {
        return buildToken(userId, email, roles, app, refreshExpirationMs, TOKEN_TYPE_REFRESH);
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String buildToken(String userId, String email, Set<UserRole> roles, AppContext app,
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
