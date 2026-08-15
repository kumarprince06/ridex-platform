package com.ridex.application.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.ridex.application.tenant.TenantAccessService;
import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.PaymentProviderType;
import com.ridex.domain.subscription.PaymentTransaction;
import com.ridex.domain.subscription.PaymentTransactionStatus;
import com.ridex.domain.subscription.PaymentTransactionType;
import com.ridex.domain.tenant.Tenant;
import com.ridex.infrastructure.payment.PaymentGatewayRegistry;
import com.ridex.infrastructure.persistence.jpa.repository.PaymentTransactionRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;

@ExtendWith(MockitoExtension.class)
class RideBillingServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private PaymentGatewayRegistry paymentGatewayRegistry;

    @Mock
    private TenantAccessService tenantAccessService;

    @Mock
    private InvoiceService invoiceService;

    @InjectMocks
    private RideBillingService rideBillingService;

    @Test
    void completeRideFarePayment_shouldMarkPaidAndGenerateInvoice() {
        String tenantId = "tenant_123";
        String tripId = "trip_456";
        String paymentId = "txn_789";

        Tenant tenant = new Tenant();
        tenant.setId(tenantId);

        PaymentTransaction payment = new PaymentTransaction();
        payment.setId(paymentId);
        payment.setTenant(tenant);
        payment.setTransactionType(PaymentTransactionType.RIDE_FARE);
        payment.setReferenceId(tripId);
        payment.setAmount(new BigDecimal("150.00"));
        payment.setCurrencyCode("USD");
        payment.setStatus(PaymentTransactionStatus.INITIATED);

        when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceService.generateInvoiceForRidePayment(paymentId)).thenReturn(new Invoice());

        PaymentTransaction result = rideBillingService.completeRideFarePayment(tenantId, paymentId);

        assertThat(result.getStatus()).isEqualTo(PaymentTransactionStatus.PAID);
        assertThat(result.getCompletedAt()).isNotNull();
        verify(invoiceService).generateInvoiceForRidePayment(paymentId);
    }

    @Test
    void createRideFarePayment_shouldStoreTransaction() {
        String tenantId = "tenant_123";
        String tripId = "trip_456";

        Tenant tenant = new Tenant();
        tenant.setId(tenantId);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(paymentTransactionRepository.save(org.mockito.ArgumentMatchers.any(PaymentTransaction.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PaymentTransaction result = rideBillingService.createRideFarePayment(tenantId, tripId,
                new BigDecimal("120.00"), "USD", PaymentProviderType.STRIPE);

        assertThat(result.getStatus()).isEqualTo(PaymentTransactionStatus.INITIATED);
        assertThat(result.getTransactionType()).isEqualTo(PaymentTransactionType.RIDE_FARE);
        assertThat(result.getReferenceId()).isEqualTo(tripId);
    }
}
