package com.ridex.wallet;

import java.sql.Timestamp;
import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.PageResponse;
import com.ridex.platform.settings.SettingsService;
import com.ridex.wallet.dto.AdminWalletResponse;
import com.ridex.wallet.dto.WalletEntryResponse;

import lombok.RequiredArgsConstructor;

/**
 * Every driver's wallet in one query. Balances are summed from the ledger in the database - one
 * statement for the page, rather than a balance query per driver.
 */
@Service
@RequiredArgsConstructor
public class AdminWalletQueries {

    private static final String BALANCES = """
            SELECT d.id, u.email, u.first_name, u.last_name, u.phone, d.on_duty,
                   COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_minor ELSE -e.amount_minor END), 0) AS balance,
                   (SELECT MAX(t.paid_at) FROM driver_wallet_topups t
                     WHERE t.driver_id = d.id AND t.status = 'SUCCEEDED') AS last_topup
              FROM driver_profiles d
              JOIN users u ON u.id = d.user_id
              LEFT JOIN ledger_entries e ON e.account_type = 'DRIVER' AND e.account_id = d.id
             WHERE (:q = '' OR u.email ILIKE :like OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :like)
             GROUP BY d.id, u.email, u.first_name, u.last_name, u.phone, d.on_duty
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final SettingsService settings;

    /**
     * @param filter ALL, OWING (below zero) or BLOCKED (below the wallet limit, so off duty)
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminWalletResponse> wallets(String filter, String q, int page, int size) {
        long limitMinor = settings.getInt("driver.wallet.min-balance", -50) * 100L;
        String having = switch (filter == null ? "ALL" : filter) {
            case "OWING" -> " HAVING COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_minor ELSE -e.amount_minor END), 0) < 0";
            case "BLOCKED" -> " HAVING COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount_minor ELSE -e.amount_minor END), 0) < :limit";
            default -> "";
        };
        int pageSize = Math.min(Math.max(1, size), 100);
        String term = q == null ? "" : q.trim();
        var params = new MapSqlParameterSource()
                .addValue("q", term).addValue("like", "%" + term + "%").addValue("limit", limitMinor)
                .addValue("size", pageSize).addValue("offset", Math.max(0, page) * pageSize);

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + BALANCES + having + ") counted", params, Long.class);
        List<AdminWalletResponse> rows = jdbc.query(BALANCES + having + " ORDER BY balance ASC, u.email LIMIT :size OFFSET :offset",
                params, (rs, n) -> {
                    long balance = rs.getLong("balance");
                    String name = String.join(" ",
                            rs.getString("first_name") == null ? "" : rs.getString("first_name"),
                            rs.getString("last_name") == null ? "" : rs.getString("last_name")).trim();
                    Timestamp lastTopUp = rs.getTimestamp("last_topup");
                    return new AdminWalletResponse(rs.getString("id"), name.isEmpty() ? null : name,
                            rs.getString("email"), rs.getString("phone"), balance, balance < limitMinor,
                            rs.getBoolean("on_duty"), lastTopUp == null ? null : lastTopUp.toInstant());
                });
        long totalItems = total == null ? 0 : total;
        return new PageResponse<>(rows, Math.max(0, page), pageSize, totalItems,
                (int) Math.ceil(totalItems / (double) pageSize));
    }

    @Transactional(readOnly = true)
    public List<WalletEntryResponse> entries(String driverId) {
        return jdbc.query("""
                SELECT entry_type, direction, amount_minor, reference_type, reference_id, created_at
                  FROM ledger_entries WHERE account_type = 'DRIVER' AND account_id = :driver
                 ORDER BY created_at DESC LIMIT 30
                """, new MapSqlParameterSource("driver", driverId), (rs, n) -> new WalletEntryResponse(
                rs.getString("entry_type"), rs.getString("direction"), rs.getLong("amount_minor"),
                rs.getString("reference_type"), rs.getString("reference_id"),
                rs.getTimestamp("created_at").toInstant()));
    }
}
