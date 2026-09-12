package com.ridex.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.auth.domain.AuthEvent;

public interface AuthEventRepository extends JpaRepository<AuthEvent, String> {

    /** This account's own history, newest first. Twenty is what a security screen shows. */
    java.util.List<AuthEvent> findTop20ByUserIdOrderByOccurredAtDesc(String userId);
}
