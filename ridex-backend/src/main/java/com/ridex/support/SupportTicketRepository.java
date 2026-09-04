package com.ridex.support;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.support.domain.SupportTicket;
import com.ridex.support.domain.TicketStatus;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {

    List<SupportTicket> findByRaisedByUserIdOrderByCreatedAtDesc(String raisedByUserId);

    // Scoped by owner, so an ownership check is not something a caller can forget.
    Optional<SupportTicket> findByIdAndRaisedByUserId(String id, String raisedByUserId);

    Page<SupportTicket> findAllByOrderByPriorityDescCreatedAtAsc(Pageable pageable);

    Page<SupportTicket> findByStatusOrderByPriorityDescCreatedAtAsc(TicketStatus status, Pageable pageable);

    long countByStatusIn(List<TicketStatus> statuses);
}
