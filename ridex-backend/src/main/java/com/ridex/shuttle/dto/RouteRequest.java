package com.ridex.shuttle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RouteRequest(
        // Uppercase and dash-free: the code appears on a rider's ticket and in operations chatter,
        // and "wf-ec" against "WF_EC" is two routes as far as the unique index is concerned.
        @NotBlank(message = "Route code is required")
        @Size(max = 20, message = "Route code must not exceed 20 characters")
        @Pattern(regexp = "[A-Z0-9_]+", message = "Route code may use A-Z, 0-9 and underscore only")
        String code,

        @NotBlank(message = "Route name is required")
        @Size(max = 120, message = "Route name must not exceed 120 characters")
        String name,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description,

        boolean active) {
}
