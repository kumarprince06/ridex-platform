package com.ridex.infrastructure.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

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

    public String generateAccessToken(String userId, String email, String role, String tenantId) {
        return buildToken(userId, email, role, tenantId, accessExpirationMs, "access");
    }

    public String generateRefreshToken(String userId, String email, String role, String tenantId) {
        return buildToken(userId, email, role, tenantId, refreshExpirationMs, "refresh");
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String buildToken(String userId, String email, String role, String tenantId, long expirationMs,
            String tokenType) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .claims(Map.of(
                        "sub", userId,
                        "email", email,
                        "role", role,
                        "tenantId", tenantId,
                        "tokenType", tokenType))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }
}
