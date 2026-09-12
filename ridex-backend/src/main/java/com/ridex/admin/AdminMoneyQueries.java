package com.ridex.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.AdminPaymentDetailResponse;
import com.ridex.admin.dto.AdminPaymentResponse;
import com.ridex.admin.dto.PageResponse;
import com.ridex.payment.PaymentEventRepository;
import com.ridex.payment.PaymentRepository;
import com.ridex.payment.domain.PaymentEvent;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

/** What was charged, and what the gateway said about it. */
@Service
@RequiredArgsConstructor
public class AdminMoneyQueries {

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final AdminRowMapper rows;

    @Transactional(readOnly = true)
    public PageResponse<AdminPaymentResponse> payments(PaymentStatus status, int page, int size) {
        var pageable = AdminPaging.of(page, size);

        var payments = status == null
                ? paymentRepository.findAllByOrderByCreatedAtDesc(pageable)
                : paymentRepository.findByStatusOrderByCreatedAtDesc(status, pageable);

        return PageResponse.of(payments, rows::toPayment);
    }

    /**
     * One payment with the gateway's own record of it.
     *
     * <p>ponytail: the events are listed without their payload. The body is the provider's JSON,
     * sometimes with card metadata in it, and nothing on the screen reads it yet.
     */
    @Transactional(readOnly = true)
    public AdminPaymentDetailResponse payment(String paymentId) {
        var payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("No such payment."));

        var events = paymentEventRepository.findByPaymentIdOrderByReceivedAtAsc(paymentId).stream()
                .map(this::toEvent)
                .toList();

        return new AdminPaymentDetailResponse(
                rows.toPayment(payment),
                payment.getProvider(),
                payment.getProviderPaymentId(),
                payment.getFailureReason(),
                events);
    }

    private AdminPaymentDetailResponse.Event toEvent(PaymentEvent event) {
        return new AdminPaymentDetailResponse.Event(event.getId(), event.getProvider(),
                event.getProviderEventId(), event.getEventType(), event.getReceivedAt());
    }
}
