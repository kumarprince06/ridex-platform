package com.ridex.util;

import com.github.f4b6a3.ulid.UlidCreator;

public class UlidGenerator {

    private UlidGenerator() {
        // Private constructor to prevent instantiation
    }

    public static String generateUlid() {
        return UlidCreator.getUlid().toString();
    }
    
}
