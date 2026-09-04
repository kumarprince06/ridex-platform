package com.ridex.shared.util;

import java.security.SecureRandom;

// Six digits, SecureRandom. Small enough to type, which is the point, so its safety comes from a
// short expiry and a hard attempt cap rather than from entropy.
public final class OtpGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private OtpGenerator() {
    }

    public static String generate() {
        // Fixed width: %06d keeps leading zeros, which a plain int would drop and make the code
        // look five digits long to the user.
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }
}
