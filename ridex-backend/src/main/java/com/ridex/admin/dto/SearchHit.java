package com.ridex.admin.dto;

/** One result in the console's search: what it is, how to show it, and the id its page opens with. */
public record SearchHit(String kind, String id, String title, String detail) {
}
