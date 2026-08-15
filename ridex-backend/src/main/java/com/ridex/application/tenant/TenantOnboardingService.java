package com.ridex.application.tenant;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.tenant.CreateTenantRequest;
import com.ridex.api.dto.tenant.TenantResponse;
import com.ridex.domain.business.TenantBusinessProfile;
import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantLifecycleStatus;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantBusinessProfileRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;
import com.ridex.shared.exception.EmailAlreadyExistsException;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TenantOnboardingService {

    private final TenantRepository tenantRepository;
    private final TenantBusinessProfileRepository tenantBusinessProfileRepository;
    private final TenantUserRepository tenantUserRepository;
    private final UserRepository userRepository;

    @Transactional
    public TenantResponse completeOnboarding(String tenantId, CreateTenantRequest request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        if (tenant.getLifecycleStatus() == TenantLifecycleStatus.ACTIVE) {
            throw new IllegalStateException("Tenant onboarding is already complete.");
        }

        if (tenantBusinessProfileRepository.findByTenantId(tenantId).isPresent()) {
            throw new IllegalStateException("Tenant business profile already exists.");
        }

        String normalizedBusinessEmail = request.getBusinessEmail().trim();
        if (tenantBusinessProfileRepository.existsByBusinessEmail(normalizedBusinessEmail)) {
            throw new EmailAlreadyExistsException(normalizedBusinessEmail);
        }

        TenantBusinessProfile profile = new TenantBusinessProfile();
        profile.setTenant(tenant);
        profile.setLegalBusinessName(request.getLegalBusinessName());
        profile.setDisplayName(request.getDisplayName());
        profile.setBusinessEmail(normalizedBusinessEmail);
        profile.setBusinessPhone(request.getBusinessPhone());
        profile.setCountryCode(request.getCountryCode());
        profile.setCurrencyCode(request.getCurrencyCode());
        profile.setTimezone(request.getTimezone());
        profile.setRegistrationNumber(request.getRegistrationNumber());
        profile.setTaxIdentificationNumber(request.getTaxIdentificationNumber());
        profile.setWebsite(request.getWebsite());
        profile.setAddressLine1(request.getAddressLine1());
        profile.setAddressLine2(request.getAddressLine2());
        profile.setCity(request.getCity());
        profile.setState(request.getState());
        profile.setPostalCode(request.getPostalCode());
        tenantBusinessProfileRepository.save(profile);

        tenantUserRepository.findByTenantId(tenantId)
                .stream()
                .filter(membership -> membership.getUser() != null)
                .forEach(membership -> {
                    User user = membership.getUser();
                    if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
                        user.setFirstName(request.getFirstName());
                    }
                    if (request.getLastName() != null && !request.getLastName().isBlank()) {
                        user.setLastName(request.getLastName());
                    }
                    if (user.getStatus() == null || user.getStatus() == UserStatus.PENDING) {
                        user.setStatus(UserStatus.ACTIVE);
                    }
                    userRepository.save(user);
                });

        Instant now = Instant.now();
        tenant.setLifecycleStatus(TenantLifecycleStatus.ACTIVE);
        tenant.setOnboardingCompletedAt(now);
        tenantRepository.save(tenant);

        return new TenantResponse(
                tenant.getId(),
                tenant.getLifecycleStatus(),
                tenant.getEmailVerifiedAt(),
                tenant.getOnboardingCompletedAt(),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt());
    }
}
