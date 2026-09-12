package com.ridex.admin;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * How every admin list is paged.
 *
 * <p>One place, because the cap is the point: an unbounded {@code ?size=} is a table scan somebody
 * eventually runs against every trip ever taken, and a cap enforced in four services is a cap that
 * is missing from the fifth.
 */
final class AdminPaging {

    private static final int MAX_PAGE_SIZE = 100;

    static PageRequest of(int page, int size, String sortBy) {
        return PageRequest.of(Math.max(0, page), clamp(size), Sort.by(sortBy).descending());
    }

    static PageRequest of(int page, int size) {
        return PageRequest.of(Math.max(0, page), clamp(size));
    }

    private static int clamp(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }

    private AdminPaging() {
    }
}
