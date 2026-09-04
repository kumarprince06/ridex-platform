package com.ridex.shared.exception;

/** 404. The thing does not exist, or does not exist for this caller - the two read the same. */
public class NotFoundException extends DomainException {

    public NotFoundException(String message) {
        super(message);
    }
}
