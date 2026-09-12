package com.ridex.admin.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** A page, without leaking Spring Data's shape into the API contract. */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <S, T> PageResponse<T> of(Page<S> page, Function<S, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
