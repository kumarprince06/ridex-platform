package com.ridex.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

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

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

class JwtAuthenticationFilterTest {

    @Test
    void shouldPopulateSecurityContextForValidTenantUser() throws Exception {
        JwtService jwtService = new JwtService("super-secret-key-which-is-very-long-for-jwt-signing", 3600000, 604800000);
        TenantUserRepository tenantUserRepository = new TestTenantUserRepository();
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

    private static final class TestTenantUserRepository implements TenantUserRepository {
        @Override
        public Optional<TenantUser> findByTenantIdAndUserId(String tenantId, String userId) {
            TenantUser membership = new TenantUser();
            membership.setStatus(TenantUserStatus.ACTIVE);
            membership.setRole(TenantUserRole.ADMIN);
            return Optional.of(membership);
        }

        @Override
        public long count() { return 0; }

        @Override
        public void delete(TenantUser entity) { }

        @Override
        public void deleteAll() { }

        @Override
        public void deleteById(String s) { }

        @Override
        public boolean existsById(String s) { return false; }

        @Override
        public void flush() { }

        @Override
        public TenantUser getReferenceById(String s) { return null; }

        @Override
        public Iterable<TenantUser> findAllById(Iterable<String> strings) { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAll() { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAllById(java.util.List<String> strings) { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAll(org.springframework.data.domain.Sort sort) { return java.util.List.of(); }

        @Override
        public org.springframework.data.domain.Page<TenantUser> findAll(org.springframework.data.domain.Pageable pageable) { return org.springframework.data.support.PageableExecutionUtils.getPage(java.util.List.of(), pageable, java.util.List::size); }

        @Override
        public <S extends TenantUser> S save(S entity) { return entity; }

        @Override
        public <S extends TenantUser> java.util.List<S> saveAll(Iterable<S> entities) { return java.util.List.of(); }

        @Override
        public Optional<TenantUser> findById(String s) { return Optional.empty(); }

        @Override
        public org.springframework.data.domain.Page<TenantUser> findAll(org.springframework.data.domain.Pageable pageable, org.springframework.data.domain.Sort sort) { return org.springframework.data.support.PageableExecutionUtils.getPage(java.util.List.of(), pageable, java.util.List::size); }

        @Override
        public void deleteAllById(Iterable<? extends String> strings) { }

        @Override
        public void deleteAll(Iterable<? extends TenantUser> entities) { }

        @Override
        public boolean existsByTenantIdAndUserId(String tenantId, String userId) { return false; }

        @Override
        public java.util.List<TenantUser> findByTenantId(String tenantId) { return java.util.List.of(); }

        @Override
        public Optional<TenantUser> findFirstByUserIdOrderByJoinedAtDesc(String userId) { return Optional.empty(); }

        @Override
        public <S extends TenantUser> S saveAndFlush(S entity) { return entity; }

        @Override
        public <S extends TenantUser> java.util.List<S> saveAllAndFlush(Iterable<S> entities) { return java.util.List.of(); }

        @Override
        public void deleteAllInBatch() { }

        @Override
        public void deleteAllByIdInBatch(Iterable<String> strings) { }

        @Override
        public void deleteInBatch(Iterable<TenantUser> entities) { }

        @Override
        public void deleteAllInBatch(Iterable<TenantUser> entities) { }

        @Override
        public void deleteAllByIdInBatch(java.util.List<String> strings) { }

        @Override
        public void deleteInBatch(java.util.List<TenantUser> entities) { }

        @Override
        public void deleteAllByIdInBatch(java.util.Collection<String> strings) { }

        @Override
        public void deleteAllInBatch(java.util.Collection<TenantUser> entities) { }

        @Override
        public java.util.List<TenantUser> findAll(org.springframework.data.domain.Sort sort, org.springframework.data.domain.Pageable pageable) { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAll(java.util.List<String> strings) { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAll(java.util.Collection<String> strings) { return java.util.List.of(); }

        @Override
        public java.util.List<TenantUser> findAll(org.springframework.data.domain.Sort sort, java.util.Collection<String> strings) { return java.util.List.of(); }

        @Override
        public TenantUser getOne(String s) { return null; }

        @Override
        public TenantUser getById(String s) { return null; }

        @Override
        public java.util.Optional<TenantUser> findById(java.util.UUID id) { return Optional.empty(); }

        @Override
        public <S extends TenantUser> java.util.List<S> findAll(java.lang.Iterable<S> entities) { return java.util.List.of(); }
    }
}
