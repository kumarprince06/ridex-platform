package com.ridex.shared.exception;

/**
 * 503. An external provider is down, misconfigured, or returned nonsense.
 *
 * <p>Separate from a conflict on purpose: the caller did nothing wrong and retrying later may
 * work, which is exactly what 503 tells them and 409 does not.
 */
public class ProviderUnavailableException extends DomainException {

    public ProviderUnavailableException(String message) {
        super(message);
    }

    public ProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
