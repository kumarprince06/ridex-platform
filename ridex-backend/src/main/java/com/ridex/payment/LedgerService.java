package com.ridex.payment;

import java.util.Currency;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.payment.domain.LedgerEntry;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

/**
 * The only way money is recorded.
 *
 * <p>Every movement goes through post(). A second write path is how the books stop balancing, and
 * nobody finds out for a month.
 */
@Service
@RequiredArgsConstructor
public class LedgerService {

    /**
     * The platform's own account.
     *
     * <p>A literal id rather than null: `account_id = NULL` is never true in SQL, so a null here
     * made the platform balance silently zero however many entries were written against it.
     */
    public static final String PLATFORM_ACCOUNT = "PLATFORM";

    private final LedgerRepository ledgerRepository;

    @Transactional
    public void credit(LedgerAccountType type, String accountId, Money amount, String entryType,
            String referenceType, String referenceId, String idempotencyKey) {
        post(type, accountId, "CREDIT", amount, entryType, referenceType, referenceId, idempotencyKey);
    }

    @Transactional
    public void debit(LedgerAccountType type, String accountId, Money amount, String entryType,
            String referenceType, String referenceId, String idempotencyKey) {
        post(type, accountId, "DEBIT", amount, entryType, referenceType, referenceId, idempotencyKey);
    }

    @Transactional(readOnly = true)
    public Money balanceOf(LedgerAccountType type, String accountId, Currency currency) {
        String resolved = accountId != null ? accountId
                : type == LedgerAccountType.PLATFORM ? PLATFORM_ACCOUNT : null;
        return Money.of(ledgerRepository.balanceOf(type, resolved), currency);
    }

    private void post(LedgerAccountType type, String rawAccountId, String direction, Money amount,
            String entryType, String referenceType, String referenceId, String idempotencyKey) {
        if (amount.amountMinor() <= 0) {
            // A zero-value entry is noise in an audit trail, and a negative one is a direction
            // somebody got backwards.
            return;
        }
        // Checked as well as constrained: a replayed webhook is expected traffic, and letting the
        // constraint fire would abort a transaction that is otherwise doing the right thing.
        if (ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            return;
        }

        // Platform entries have no owner, so they get the platform's own id rather than a null
        // that no equality test can match.
        String accountId = rawAccountId != null ? rawAccountId
                : type == LedgerAccountType.PLATFORM ? PLATFORM_ACCOUNT : null;

        LedgerEntry entry = new LedgerEntry();
        entry.setAccountType(type);
        entry.setAccountId(accountId);
        entry.setDirection(direction);
        entry.setAmountMinor(amount.amountMinor());
        entry.setCurrency(amount.currency().getCurrencyCode());
        entry.setEntryType(entryType);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setIdempotencyKey(idempotencyKey);
        ledgerRepository.save(entry);
    }
}
