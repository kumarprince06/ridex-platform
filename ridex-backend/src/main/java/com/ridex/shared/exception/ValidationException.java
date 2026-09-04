package com.ridex.shared.exception;

/** 400. The request itself is wrong, in a way bean validation could not express. */
public class ValidationException extends DomainException {

    public ValidationException(String message) {
        super(message);
    }
}
