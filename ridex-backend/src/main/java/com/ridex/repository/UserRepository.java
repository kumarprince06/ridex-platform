package com.ridex.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.entity.User;

public interface UserRepository extends JpaRepository<User, String> {

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);
    
}
