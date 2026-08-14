package com.ridex.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dto.request.RegisterRequest;
import com.ridex.entity.EmailVerificationToken;
import com.ridex.entity.Tenant;
import com.ridex.entity.TenantUser;
import com.ridex.entity.User;
import com.ridex.enums.TenantLifecycleStatus;
import com.ridex.enums.TenantUserRole;
import com.ridex.enums.TenantUserStatus;
import com.ridex.enums.UserStatus;
import com.ridex.exception.EmailAlreadyExistsException;
import com.ridex.repository.EmailVerificationTokenRepository;
import com.ridex.repository.TenantRepository;
import com.ridex.repository.TenantUserRepository;
import com.ridex.repository.UserRepository;
import com.ridex.util.VerificationTokenGenerator;

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
