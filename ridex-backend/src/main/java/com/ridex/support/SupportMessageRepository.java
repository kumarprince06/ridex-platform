package com.ridex.support;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.support.domain.SupportMessage;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, String> {

    List<SupportMessage> findByTicketIdOrderByCreatedAtAsc(String ticketId);
}
