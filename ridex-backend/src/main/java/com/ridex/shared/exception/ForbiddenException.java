package com.ridex.shared.exception;

/** 403. Authenticated, and not allowed to do this. */
public class ForbiddenException extends DomainException {

    public ForbiddenException(String message) {
        super(message);
    }
}
