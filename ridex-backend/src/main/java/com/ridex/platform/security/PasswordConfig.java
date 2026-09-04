package com.ridex.platform.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    // Cost 12, not the library default of 10: roughly four times the work per guess, and still
    // well under 250ms per login on modern hardware.
    private static final int BCRYPT_STRENGTH = 12;

    /**
     * BCrypt embeds a random salt in every hash, so the same password encodes differently each
     * time and the digest can only be checked with matches(), never looked up by equality.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

}
