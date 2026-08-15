package com.ridex.application.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.tenant.CreateTenantRequest;
import com.ridex.api.dto.tenant.TenantResponse;
import com.ridex.domain.tenant.Tenant;
import com.ridex.domain.tenant.TenantLifecycleStatus;
import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.domain.user.User;
import com.ridex.domain.user.UserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantBusinessProfileRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;
import com.ridex.infrastructure.persistence.jpa.repository.UserRepository;

@SpringBootTest
@ActiveProfiles("default")
@Transactional
class TenantOnboardingServiceTest {

    @Autowired
    private TenantOnboardingService tenantOnboardingService;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantUserRepository tenantUserRepository;

    @Autowired
    private TenantBusinessProfileRepository tenantBusinessProfileRepository;

    @Test
    void completeOnboarding_createsBusinessProfile_andActivatesTenant() {
        User admin = new User();
        admin.setEmail("admin@yopmail.com");
        admin.setPasswordHash("Ridex@123");
        admin.setStatus(UserStatus.PENDING);
        userRepository.save(admin);

        Tenant tenant = new Tenant();
        tenant.setLifecycleStatus(TenantLifecycleStatus.REGISTERED);
        tenantRepository.save(tenant);

        TenantUser membership = new TenantUser();
        membership.setTenant(tenant);
        membership.setUser(admin);
        membership.setRole(TenantUserRole.ADMIN);
        membership.setStatus(TenantUserStatus.ACTIVE);
        tenantUserRepository.save(membership);

        CreateTenantRequest request = new CreateTenantRequest();
        request.setFirstName("Jane");
        request.setLastName("Doe");
        request.setBusinessName("Ridex Labs");
        request.setLegalBusinessName("Ridex Labs Pvt Ltd");
        request.setDisplayName("Ridex Labs");
        request.setBusinessEmail("hello@ridexlabs.com");
        request.setBusinessPhone("+1-555-123-4567");
        request.setCountryCode("US");
        request.setCurrencyCode("USD");
        request.setTimezone("UTC");
        request.setRegistrationNumber("REG-1001");
        request.setTaxIdentificationNumber("TIN-1001");
        request.setWebsite("https://ridexlabs.com");
        request.setAddressLine1("10 Market Street");
        request.setAddressLine2("Suite 200");
        request.setCity("Seattle");
        request.setState("WA");
        request.setPostalCode("98101");

        TenantResponse response = tenantOnboardingService.completeOnboarding(tenant.getId(), request);

        assertEquals(TenantLifecycleStatus.ACTIVE, response.lifecycleStatus());
        assertNotNull(response.onboardingCompletedAt());
        assertNotNull(tenantBusinessProfileRepository.findByTenantId(tenant.getId()).orElseThrow());

        User updatedAdmin = userRepository.findById(admin.getId()).orElseThrow();
        assertEquals("Jane", updatedAdmin.getFirstName());
        assertEquals("Doe", updatedAdmin.getLastName());
    }
}
