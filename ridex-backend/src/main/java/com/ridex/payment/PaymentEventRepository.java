package com.ridex.payment;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.payment.domain.PaymentEvent;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, String> {

    boolean existsByProviderAndProviderEventId(String provider, String providerEventId);
}
