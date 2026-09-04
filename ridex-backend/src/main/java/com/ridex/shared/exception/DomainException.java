package com.ridex.shared.exception;

/**
 * Failures the caller can understand and act on, as opposed to bugs.
 *
 * <p>Everything here maps to a deliberate status code. Anything that escapes as a plain
 * IllegalArgumentException or IllegalStateException is a programming error and becomes a 500,
 * which is what it should be - those used to be mapped to 400 and 409 globally, so a
 * misconfigured API key surfaced to riders as "409 Conflict".
 */
public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }

    protected DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
