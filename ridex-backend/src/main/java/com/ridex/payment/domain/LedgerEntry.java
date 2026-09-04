package com.ridex.payment.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One movement of money. Append-only: a correction is a reversing entry, never an edit.
 *
 * <p>Balances are sums over these rows. A stored balance is a number that can disagree with the
 * entries behind it, and nobody finds out for a month.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20, updatable = false)
    private LedgerAccountType accountType;

    @Column(name = "account_id", length = 26, updatable = false)
    private String accountId;

    @Column(name = "direction", nullable = false, length = 10, updatable = false)
    private String direction;

    @Column(name = "amount_minor", nullable = false, updatable = false)
    private long amountMinor;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(name = "entry_type", nullable = false, length = 40, updatable = false)
    private String entryType;

    @Column(name = "reference_type", length = 30, updatable = false)
    private String referenceType;

    @Column(name = "reference_id", length = 26, updatable = false)
    private String referenceId;

    @Column(name = "idempotency_key", nullable = false, length = 140, updatable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.createdAt = Instant.now();
    }
}
