package com.ridex.support;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;
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
@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse raise(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody CreateTicketRequest request) {
        return supportService.raise(principal.userId(), SupportService.roleOf(principal.roles()), request);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<TicketResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return supportService.mine(principal.userId());
    }

    @GetMapping("/{ticketId}")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse get(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId) {
        return supportService.get(principal.userId(), ticketId);
    }

    // The live chat: the ticket thread, posted into from either side.
    @PostMapping("/{ticketId}/messages")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse reply(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId, @Valid @RequestBody PostMessageRequest request) {
        return supportService.reply(
                principal.userId(), SupportService.roleOf(principal.roles()), ticketId, request);
    }
}
