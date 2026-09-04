package com.ridex.admin;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.PageResponse;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.support.SupportService;
import com.ridex.support.domain.TicketStatus;
import com.ridex.support.dto.PostMessageRequest;
import com.ridex.support.dto.ResolveTicketRequest;
import com.ridex.support.dto.TicketResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * The support queue.
 *
 * <p>Support agents work here and nowhere else - they cannot approve drivers or move money, which
 * is the split docs/07 draws and the one that matters most in a marketplace.
 */
@RestController
@RequestMapping("/api/v1/admin/support")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPPORT', 'OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminSupportController {

    private final SupportService supportService;

    @GetMapping("/tickets")
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<TicketResponse> queue(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        // Urgent first, then oldest: a safety ticket must never wait behind a lost umbrella.
        return PageResponse.of(supportService.queue(status, page, size),
                ticket -> supportService.viewAsAgent(ticket.getId()));
    }

    @GetMapping("/tickets/{ticketId}")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse get(@PathVariable String ticketId) {
        return supportService.viewAsAgent(ticketId);
    }

    @PostMapping("/tickets/{ticketId}/messages")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse reply(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId, @Valid @RequestBody PostMessageRequest request) {
        return supportService.agentReply(principal.userId(), ticketId, request);
    }

    @Audited(action = "TICKET_RESOLVED", targetType = "TICKET")
    @PostMapping("/tickets/{ticketId}/resolve")
    @ResponseStatus(HttpStatus.OK)
    public TicketResponse resolve(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String ticketId, @Valid @RequestBody ResolveTicketRequest request) {
        return supportService.resolve(principal.userId(), ticketId, request);
    }
}
