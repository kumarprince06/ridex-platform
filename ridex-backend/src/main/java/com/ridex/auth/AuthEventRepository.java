package com.ridex.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.auth.domain.AuthEvent;

public interface AuthEventRepository extends JpaRepository<AuthEvent, String> {
}
