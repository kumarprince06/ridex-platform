package com.ridex.application.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.auth.LoginRequest;
import com.ridex.api.dto.auth.LoginResponse;
import com.ridex.api.dto.auth.LogoutRequest;
import com.ridex.api.dto.auth.RefreshTokenRequest;
import com.ridex.api.dto.auth.RefreshTokenResponse;
import com.ridex.api.dto.auth.RegisterRequest;
import com.ridex.domain.user.AppContext;
import com.ridex.domain.user.RefreshToken;
import com.ridex.domain.user.TokenPurpose;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserRole;
import com.ridex.domain.user.UserStatus;
import com.ridex.domain.user.UserToken;
import com.ridex.infrastructure.persistence.jpa.repository.RefreshTokenRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserTokenRepository;
import com.ridex.infrastructure.security.JwtService;
import com.ridex.shared.exception.EmailAlreadyExistsException;
import com.ridex.shared.util.VerificationTokenGenerator;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration VERIFICATION_TOKEN_VALIDITY = Duration.ofHours(24);
    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(7);

    private final UserRepository userRepository;
    private final UserTokenRepository userTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Opens a rider or driver account and issues a verification token. No tenant is created or
     * resolved - that conflict between the tenant boundary and public signup is exactly why the
     * multi-tenant model was dropped (ADR-001).
     *
     * <p>No email is sent yet; that arrives in a later task as an after-commit event.
     *
     * @return the raw verification token, for the caller to deliver. Never persisted, never logged.
     */
    @Transactional
    public String register(RegisterRequest request) {
        if (!request.role().isSelfRegisterable()) {
            // Otherwise a public request body decides who is staff.
            throw new IllegalArgumentException("Accounts of that type cannot be self-registered.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.PENDING);
        user.setRoles(EnumSet.of(request.role()));
        userRepository.save(user);

        String rawToken = VerificationTokenGenerator.generateRawToken();

        UserToken token = new UserToken();
        token.setUser(user);
        token.setPurpose(TokenPurpose.EMAIL_VERIFICATION);
        token.setTokenHash(VerificationTokenGenerator.hash(rawToken));
        token.setExpiresAt(Instant.now().plus(VERIFICATION_TOKEN_VALIDITY));
        userTokenRepository.save(token);

        return rawToken;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String userAgent, String ipAddress) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        requireLoginableStatus(user);

        AppContext app = request.app();
        Set<UserRole> granted = app.grantableFrom(user.getRoles());
        if (granted.isEmpty()) {
            // The password was correct, so this is an authorization answer, not an identity one -
            // and it is the message that stops a driver being told only "403" in the driver app.
            throw new AccessDeniedException(app.rejectionMessage());
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), granted, app);
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId(), user.getEmail(), granted, app);

        // One row per login, not one row per user. The previous code deleted every existing token
        // on each login, so signing in on a phone silently signed the same person out on a tablet.
        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(VerificationTokenGenerator.hash(refreshTokenValue));
        refreshToken.setUserAgent(truncate(userAgent, 255));
        refreshToken.setIpAddress(truncate(ipAddress, 45));
        refreshToken.setLastUsedAt(now);
        refreshToken.setExpiresAt(now.plus(REFRESH_TOKEN_VALIDITY));
        refreshTokenRepository.save(refreshToken);

        user.setLastLoginAt(now);
        userRepository.save(user);

        return new LoginResponse(
                accessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                granted,
                app,
                refreshTokenValue);
    }

    @Transactional
    public RefreshTokenResponse refresh(RefreshTokenRequest request) {
        String rawRefreshToken = request.refreshToken().trim();

        Claims claims;
        try {
            claims = jwtService.parseClaims(rawRefreshToken);
        } catch (RuntimeException ex) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        if (!JwtService.TOKEN_TYPE_REFRESH.equals(claims.get(JwtService.CLAIM_TOKEN_TYPE, String.class))) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        RefreshToken storedToken = refreshTokenRepository
                .findByTokenHash(VerificationTokenGenerator.hash(rawRefreshToken))
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        Instant now = Instant.now();
        if (storedToken.getRevokedAt() != null || storedToken.getExpiresAt().isBefore(now)) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        User user = storedToken.getUser();
        requireLoginableStatus(user);

        AppContext app = AppContext.valueOf(claims.get(JwtService.CLAIM_APP, String.class));

        // Re-derived from the account rather than copied from the old token, so a role removed by
        // operations stops applying at the next refresh instead of surviving for the token's life.
        Set<UserRole> granted = app.grantableFrom(user.getRoles());
        if (granted.isEmpty()) {
            storedToken.setRevokedAt(now);
            refreshTokenRepository.save(storedToken);
            throw new AccessDeniedException(app.rejectionMessage());
        }

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), granted, app);
        String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail(), granted, app);

        // Rotation in place: the row is the device session, so it keeps its identity and its
        // user_agent while the secret it holds changes.
        storedToken.setTokenHash(VerificationTokenGenerator.hash(newRefreshToken));
        storedToken.setExpiresAt(now.plus(REFRESH_TOKEN_VALIDITY));
        storedToken.setLastUsedAt(now);
        refreshTokenRepository.save(storedToken);

        return new RefreshTokenResponse(
                newAccessToken,
                "Bearer",
                user.getId(),
                user.getEmail(),
                granted,
                app,
                newRefreshToken);
    }

    /**
     * Ends one device session. Silent when the token is unknown, already revoked or owned by
     * someone else - a logout that reported which of those it was would answer questions about
     * other people's sessions.
     */
    @Transactional
    public void logout(LogoutRequest request, String callerUserId) {
        refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(request.refreshToken().trim()))
                .filter(token -> token.getUser().getId().equals(callerUserId))
                .filter(token -> token.getRevokedAt() == null)
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    /**
     * Only a fully active account may hold a session. The previous version rejected PENDING alone,
     * which let a SUSPENDED or DELETED account log in normally.
     */
    private void requireLoginableStatus(User user) {
        if (user.getStatus() == UserStatus.ACTIVE) {
            return;
        }

        throw new AccessDeniedException(switch (user.getStatus()) {
            case PENDING -> "Email verification is required before login.";
            case SUSPENDED -> "This account is suspended.";
            default -> "This account is not active.";
        });
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
