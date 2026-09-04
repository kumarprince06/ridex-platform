package com.ridex.auth;

import java.util.EnumSet;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Creates the first super admin, because staff roles are rejected at public signup and there is
 * nobody to provision them otherwise.
 *
 * <p>Runs only when the environment supplies credentials and no super admin exists yet, so it
 * cannot overwrite a real account or resurrect one that was deliberately removed.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:}")
    private String email;

    @Value("${app.bootstrap.admin-password:}")
    private String password;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) {
            return;
        }
        if (userRepository.existsByRole(UserRole.SUPER_ADMIN)) {
            return;
        }

        User admin = new User();
        admin.setEmail(email.trim().toLowerCase());
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRoles(EnumSet.of(UserRole.SUPER_ADMIN));
        // Already verified: there is no inbox to send a code to during a deployment.
        admin.setStatus(UserStatus.ACTIVE);
        admin.setEmailVerifiedAt(Instant.now());
        userRepository.save(admin);

        log.warn("Created bootstrap super admin {}. Change this password before anyone else can.",
                admin.getEmail());
    }
}
