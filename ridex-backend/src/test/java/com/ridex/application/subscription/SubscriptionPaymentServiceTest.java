package com.ridex.application.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.SubscriptionPayment;
import com.ridex.domain.subscription.SubscriptionPaymentStatus;
import com.ridex.domain.tenant.Tenant;
import com.ridex.infrastructure.payment.PaymentGatewayRegistry;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPaymentRepository;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPlanRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantSubscriptionRepository;
import com.ridex.application.tenant.TenantAccessService;

@ExtendWith(MockitoExtension.class)
class SubscriptionPaymentServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private TenantSubscriptionRepository tenantSubscriptionRepository;

    @Mock
    private SubscriptionPaymentRepository paymentRepository;

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Mock
    private PaymentGatewayRegistry paymentGatewayRegistry;

    @Mock
    private TenantAccessService tenantAccessService;

    @Mock
    private InvoiceService invoiceService;

    @InjectMocks
    private SubscriptionPaymentService subscriptionPaymentService;

    @Test
    void markPaymentAsPaid_shouldGenerateInvoiceAndCompletePayment() {
        String paymentId = "pay_123";
        Tenant tenant = new Tenant();
        tenant.setId("tenant_123");

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setId(paymentId);
        payment.setTenant(tenant);
        payment.setStatus(SubscriptionPaymentStatus.INITIATED);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceService.generateInvoiceForPayment(paymentId)).thenReturn(new Invoice());

        SubscriptionPayment result = subscriptionPaymentService.markPaymentAsPaid(paymentId);

        assertThat(result.getStatus()).isEqualTo(SubscriptionPaymentStatus.PAID);
        assertThat(result.getCompletedAt()).isNotNull();
        verify(invoiceService).generateInvoiceForPayment(paymentId);
    }
}
