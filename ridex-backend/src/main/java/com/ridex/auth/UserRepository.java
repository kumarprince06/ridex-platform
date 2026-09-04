package com.ridex.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.auth.domain.User;

public interface UserRepository extends JpaRepository<User, String> {

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByEmail(String email);
    
}
