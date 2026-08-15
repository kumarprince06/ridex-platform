package com.ridex.application.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.auth.RegisterRequest;
import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantLifecycleStatus;
import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.domain.user.EmailVerificationToken;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.EmailVerificationTokenRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;
import com.ridex.shared.exception.EmailAlreadyExistsException;
import com.ridex.shared.util.VerificationTokenGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration TOKEN_VALIDITY = Duration.ofHours(24);

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantUserRepository tenantUserRepository;
    private final EmailVerificationTokenRepository tokenRepository;
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
        // uk_users_email is case-sensitive in Postgres, so normalise before checking or storing.
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        // Insert order is dictated by the foreign keys: user and tenant must exist before the
        // membership row that references both.
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.PENDING);
        userRepository.save(user);

        // No business profile yet - legal name, country, currency and timezone are all collected
        // during onboarding, which is why the tenant starts as REGISTERED rather than ACTIVE.
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

}
