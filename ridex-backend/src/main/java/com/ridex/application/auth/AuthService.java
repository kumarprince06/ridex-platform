package com.ridex.application.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.auth.LoginRequest;
import com.ridex.api.dto.auth.LoginResponse;
import com.ridex.api.dto.auth.RefreshTokenRequest;
import com.ridex.api.dto.auth.RefreshTokenResponse;
import com.ridex.api.dto.auth.RegisterRequest;
import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantLifecycleStatus;
import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.domain.user.EmailVerificationToken;
import com.ridex.domain.user.RefreshToken;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.EmailVerificationTokenRepository;
import com.ridex.infrastructure.persistence.jpa.repository.RefreshTokenRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;
import com.ridex.infrastructure.security.JwtService;
import com.ridex.shared.exception.EmailAlreadyExistsException;
import com.ridex.shared.util.VerificationTokenGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration TOKEN_VALIDITY = Duration.ofHours(24);
    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(7);

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates the account, its tenant, and the ADMIN membership linking them, then issues a
     * verification token. Everything commits together or not at all - a tenant with no admin, or an
     * admin with no way to verify, would both be broken states.
     *
     * <p>No email is sent yet; that arrives in a later task as an after-commit event.
     *
     * @return the raw verification token, for the caller to deliver. Never persisted, never logged.
     */
    @Transactional
    public String register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.PENDING);
        userRepository.save(user);

        Tenant tenant = new Tenant();
        tenant.setLifecycleStatus(TenantLifecycleStatus.REGISTERED);
        tenantRepository.save(tenant);

        TenantUser membership = new TenantUser();
        membership.setUser(user);
        membership.setTenant(tenant);
        membership.setRole(TenantUserRole.ADMIN);
        membership.setStatus(TenantUserStatus.ACTIVE);
        tenantUserRepository.save(membership);

        String rawToken = VerificationTokenGenerator.generateRawToken();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(VerificationTokenGenerator.hash(rawToken));
        token.setExpiresAt(Instant.now().plus(TOKEN_VALIDITY));
        tokenRepository.save(token);

        return rawToken;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        if (user.getStatus() == UserStatus.PENDING) {
            throw new IllegalStateException("Email verification is required before login.");
        }

        String role = resolveRole(user.getId());
        String tenantId = resolveTenantId(user.getId());
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), role, tenantId);
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId(), email, role, tenantId);

        refreshTokenRepository.deleteByUserId(user.getId());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(VerificationTokenGenerator.hash(refreshTokenValue));
        refreshToken.setExpiresAt(Instant.now().plus(REFRESH_TOKEN_VALIDITY));
        refreshToken.setRevokedAt(null);
        refreshTokenRepository.save(refreshToken);

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        return new LoginResponse(
                accessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                role,
                tenantId,
                refreshTokenValue);
    }

    @Transactional
    public RefreshTokenResponse refresh(RefreshTokenRequest request) {
        String rawRefreshToken = request.refreshToken().trim();
        String tokenHash = VerificationTokenGenerator.hash(rawRefreshToken);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (storedToken.getRevokedAt() != null || storedToken.getExpiresAt().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        User user = storedToken.getUser();
        String role = resolveRole(user.getId());
        String tenantId = resolveTenantId(user.getId());

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), role, tenantId);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), role, tenantId);

        storedToken.setTokenHash(VerificationTokenGenerator.hash(newRefreshToken));
        storedToken.setExpiresAt(Instant.now().plus(REFRESH_TOKEN_VALIDITY));
        storedToken.setRevokedAt(null);
        refreshTokenRepository.save(storedToken);

        return new RefreshTokenResponse(
                newAccessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                role,
                tenantId,
                newRefreshToken);
    }

    private String resolveRole(String userId) {
        return tenantUserRepository.findFirstByUserIdOrderByJoinedAtDesc(userId)
                .map(TenantUser::getRole)
                .map(Enum::name)
                .orElse(TenantUserRole.USER.name());
    }

    private String resolveTenantId(String userId) {
        return tenantUserRepository.findFirstByUserIdOrderByJoinedAtDesc(userId)
                .map(TenantUser::getTenant)
                .map(Tenant::getId)
                .orElse(null);
    }
}

