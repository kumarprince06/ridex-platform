package com.ridex.shared.exception;

/** 409. The request is well formed but the current state does not allow it. */
public class ConflictException extends DomainException {

    public ConflictException(String message) {
        super(message);
    }
}
