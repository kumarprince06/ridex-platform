package com.ridex.support;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.UserRole;
import com.ridex.ride.RideRequestRepository;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.support.domain.*;
import com.ridex.support.dto.*;

import lombok.RequiredArgsConstructor;

/**
 * Support tickets, raised by riders and drivers alike.
 *
 * <p>The thread is the ticket. A case with a status but no conversation is a queue entry, not
 * support - so every ticket is created with its first message already in it.
 */
@Service
@RequiredArgsConstructor
public class SupportService {

    private static final int MAX_PAGE_SIZE = 100;

    private final SupportTicketRepository ticketRepository;
    private final SupportMessageRepository messageRepository;
    private final RideRequestRepository rideRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public TicketResponse raise(String userId, String role, CreateTicketRequest request) {
        SupportTicket ticket = new SupportTicket();
        ticket.setRaisedByUserId(userId);
        ticket.setRaisedByRole(role);
        ticket.setCategory(request.category());
        // Priority comes from the category, never from the reporter: a field they control means
        // every ticket is urgent, and then none of them are.
        ticket.setPriority(priorityFor(request.category()));
        ticket.setSubject(request.subject().trim());

        if (request.rideId() != null && !request.rideId().isBlank()) {
            var ride = rideRequestRepository.findById(request.rideId())
                    .orElseThrow(() -> new NotFoundException("No such ride."));
            ticket.setRideId(ride.getId());
            // Who it is against is inferred from the ride rather than typed: a reporter naming
            // somebody by hand is a reporter who can name anybody.
            ticket.setAgainstUserId(otherPartyOn(ride.getId(), userId));
        }

        ticketRepository.save(ticket);
        appendMessage(ticket.getId(), userId, role, request.message(), false);

        return get(userId, ticket.getId());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> mine(String userId) {
        return ticketRepository.findByRaisedByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ticket -> toResponse(ticket, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse get(String userId, String ticketId) {
        SupportTicket ticket = ticketRepository.findByIdAndRaisedByUserId(ticketId, userId)
                .orElseThrow(() -> new NotFoundException("No such ticket."));
        // Internal notes are hidden here: agents write them for each other.
        return toResponse(ticket, false);
    }

    /** The owner replying reopens a ticket that was waiting on them. */
    @Transactional
    public TicketResponse reply(String userId, String role, String ticketId, PostMessageRequest request) {
        SupportTicket ticket = ticketRepository.findByIdAndRaisedByUserId(ticketId, userId)
                .orElseThrow(() -> new NotFoundException("No such ticket."));

        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ConflictException("This ticket is closed. Please raise a new one.");
        }
        if (ticket.getStatus() == TicketStatus.AWAITING_REPLY
                || ticket.getStatus() == TicketStatus.RESOLVED) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticketRepository.save(ticket);
        }

        // internal is ignored for the owner: it is an agent-only concept, and honouring it here
        // would let somebody hide their own message from the agent reading the thread.
        appendMessage(ticketId, userId, role, request.body(), false);
        return get(userId, ticketId);
    }

    // --- agent side ---

    @Transactional(readOnly = true)
    public Page<SupportTicket> queue(TicketStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));
        return status == null
                ? ticketRepository.findAllByOrderByPriorityDescCreatedAtAsc(pageable)
                : ticketRepository.findByStatusOrderByPriorityDescCreatedAtAsc(status, pageable);
    }

    @Transactional(readOnly = true)
    public TicketResponse viewAsAgent(String ticketId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("No such ticket."));
        return toResponse(ticket, true);
    }

    @Transactional
    public TicketResponse agentReply(String agentUserId, String ticketId, PostMessageRequest request) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("No such ticket."));

        boolean internal = Boolean.TRUE.equals(request.internal());
        appendMessage(ticketId, agentUserId, "SUPPORT", request.body(), internal);

        // An internal note is not a response to the person waiting, so it must not stop the SLA
        // clock or move the ticket into their court.
        if (!internal) {
            if (ticket.getFirstResponseAt() == null) {
                ticket.setFirstResponseAt(Instant.now());
            }
            ticket.setStatus(TicketStatus.AWAITING_REPLY);
        } else if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        ticket.setAssignedToUserId(agentUserId);
        ticketRepository.save(ticket);
        return viewAsAgent(ticketId);
    }

    @Transactional
    public TicketResponse resolve(String agentUserId, String ticketId, ResolveTicketRequest request) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("No such ticket."));

        if (ticket.isClosed()) {
            throw new ConflictException("This ticket is already closed.");
        }

        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setResolution(request.resolution().trim());
        ticket.setResolvedAt(Instant.now());
        ticket.setAssignedToUserId(agentUserId);
        if (ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(Instant.now());
        }
        ticketRepository.save(ticket);

        // The resolution is posted into the thread as well, so the person raising it reads an
        // explanation rather than watching the status change silently.
        appendMessage(ticketId, agentUserId, "SUPPORT", request.resolution().trim(), false);
        return viewAsAgent(ticketId);
    }

    private void appendMessage(String ticketId, String authorUserId, String role, String body,
            boolean internal) {
        SupportMessage message = new SupportMessage();
        message.setTicketId(ticketId);
        message.setAuthorUserId(authorUserId);
        message.setAuthorRole(role);
        message.setBody(body.trim());
        message.setInternal(internal);
        messageRepository.save(message);
    }

    /** Safety is urgent whatever anybody types; money is high; the rest is normal. */
    private static TicketPriority priorityFor(TicketCategory category) {
        return switch (category) {
            case SAFETY, DRIVER_BEHAVIOUR, RIDER_BEHAVIOUR -> TicketPriority.URGENT;
            case BILLING, FARE_DISPUTE, REFUND_REQUEST, PAYOUT -> TicketPriority.HIGH;
            default -> TicketPriority.NORMAL;
        };
    }

    /** The other side of a ride: a rider's ticket is about their driver and the reverse. */
    private String otherPartyOn(String rideId, String raiserUserId) {
        return rideRequestRepository.findById(rideId).map(ride -> {
            String riderUserId = ride.getRider().getUser().getId();
            return riderUserId.equals(raiserUserId) ? null : riderUserId;
        }).orElse(null);
    }

    private TicketResponse toResponse(SupportTicket ticket, boolean includeInternal) {
        List<TicketMessageResponse> messages = messageRepository
                .findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .filter(message -> includeInternal || !message.isInternal())
                .map(message -> new TicketMessageResponse(
                        message.getId(),
                        message.getAuthorRole(),
                        "SUPPORT".equals(message.getAuthorRole()),
                        message.getBody(),
                        message.isInternal(),
                        message.getCreatedAt()))
                .toList();

        String raisedByEmail = userRepository.findById(ticket.getRaisedByUserId())
                .map(user -> user.getEmail())
                .orElse(null);

        return new TicketResponse(
                ticket.getId(), ticket.getCategory(), ticket.getPriority(), ticket.getStatus(),
                ticket.getSubject(), ticket.getRideId(), ticket.getRaisedByRole(), raisedByEmail,
                ticket.getFirstResponseAt(), ticket.getResolvedAt(), ticket.getResolution(),
                ticket.getCreatedAt(), messages);
    }

    public static String roleOf(java.util.Set<UserRole> roles) {
        return roles.contains(UserRole.DRIVER) ? "DRIVER" : "RIDER";
    }
}
