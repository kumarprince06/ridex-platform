package com.ridex.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import java.util.Collection;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByEmail(String email);

    /** Everyone holding any of these roles - the console's own accounts. */
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r WHERE r IN :roles ORDER BY u.email")
    List<User> findByAnyRole(@Param("roles")
            Collection<UserRole> roles);

    Optional<User> findByReferralCode(String referralCode);

    // Guards the bootstrap: once a real super admin exists, the env vars stop having any effect.
    @Query("SELECT COUNT(u) > 0 FROM User u JOIN u.roles r WHERE r = :role")
    boolean existsByRole(@Param("role") UserRole role);
    
}
