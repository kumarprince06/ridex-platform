package com.ridex.support.dto;

import com.ridex.support.domain.TicketCategory;

/** One thing a ticket can be about, in the words the person raising it reads. */
public record CategoryResponse(TicketCategory code, String label) {

    public static CategoryResponse of(TicketCategory category) {
        return new CategoryResponse(category, category.label());
    }
}
