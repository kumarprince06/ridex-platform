package com.ridex.application.tenant;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.tenant.CreateTenantMemberRequest;
import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TenantMemberService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final TenantUserRepository tenantUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantAccessService tenantAccessService;

    @Transactional
    public String createMember(String tenantId, CreateTenantMemberRequest request) {
        tenantAccessService.requireTenantAccess(tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        String email = request.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setPasswordHash(passwordEncoder.encode("Temp@12345"));
                    newUser.setStatus(UserStatus.PENDING);
                    newUser.setFirstName(request.firstName());
                    newUser.setLastName(request.lastName());
                    return userRepository.save(newUser);
                });

        if (tenantUserRepository.existsByTenantIdAndUserId(tenantId, user.getId())) {
            throw new IllegalStateException("User is already a member of this tenant");
        }

        TenantUserRole role = TenantUserRole.valueOf(request.role().trim().toUpperCase(Locale.ROOT));

        TenantUser membership = new TenantUser();
        membership.setTenant(tenant);
        membership.setUser(user);
        membership.setRole(role);
        membership.setStatus(TenantUserStatus.INVITED);
        tenantUserRepository.save(membership);

        return user.getId();
    }
}
