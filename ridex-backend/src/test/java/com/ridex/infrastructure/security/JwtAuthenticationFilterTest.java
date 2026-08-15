package com.ridex.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import com.ridex.domain.tenant.TenantUser;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;

class JwtAuthenticationFilterTest {

    @Test
    void shouldPopulateSecurityContextForValidTenantUser() throws Exception {
        JwtService jwtService = new JwtService("super-secret-key-which-is-very-long-for-jwt-signing", 3600000, 604800000);
        TenantUserRepository tenantUserRepository = mock(TenantUserRepository.class);
        TenantUser membership = new TenantUser();
        membership.setStatus(TenantUserStatus.ACTIVE);
        membership.setRole(TenantUserRole.ADMIN);
        when(tenantUserRepository.findByTenantIdAndUserId("tenant-1", "user-1")).thenReturn(Optional.of(membership));

        JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtService, tenantUserRepository);

        String token = jwtService.generateAccessToken("user-1", "tenant-admin@example.com", TenantUserRole.ADMIN.name(), "tenant-1");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(ServletRequest req, ServletResponse res) {
                assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
                assertThat(TenantContextHolder.get()).isNotNull();
                assertThat(TenantContextHolder.get().tenantId()).isEqualTo("tenant-1");
            }
        };

        jwtAuthenticationFilter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(TenantContextHolder.get()).isNull();
    }

}
