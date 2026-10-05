package com.ridex.support;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
import com.ridex.support.dto.CategoryResponse;
import com.ridex.support.dto.CreateTicketRequest;
import com.ridex.support.dto.PostMessageRequest;
import com.ridex.support.dto.TicketResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Support, from the rider's or driver's side.
 *
 * <p>Not role-restricted: both raise tickets, often about each other, and the role is taken from
 * the token rather than from the path.
 */
@Tag(name = "Support tickets")
@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @Operation(summary = "Raise a support ticket")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse raise(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CreateTicketRequest request) {
        return supportService.raise(principal.userId(), SupportService.roleOf(principal.roles()), request);
    }

    /** What this person may raise a ticket about, in their own words, from one place. */
    @Operation(summary = "List the ticket categories this caller may raise")
    @GetMapping("/categories")
    @ResponseStatus(HttpStatus.OK)
    public List<CategoryResponse> categories(@AuthenticationPrincipal JwtPrincipal principal) {
        return supportService.categoriesFor(SupportService.roleOf(principal.roles()));
    }

    @Operation(summary = "List the caller's tickets")
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<TicketResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return supportService.mine(principal.userId());
    }

    @Operation(summary = "Get one of the caller's tickets with its thread")
    @GetMapping("/{ticketId}")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse get(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId) {
        return supportService.get(principal.userId(), ticketId);
    }

    // The live chat: the ticket thread, posted into from either side.
    @Operation(summary = "Reply on one of the caller's tickets")
    @PostMapping("/{ticketId}/messages")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse reply(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId, @Valid @RequestBody PostMessageRequest request) {
        return supportService.reply(
                principal.userId(), SupportService.roleOf(principal.roles()), ticketId, request);
    }
}
