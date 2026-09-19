package com.ridex.admin;

import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.SearchHit;

import lombok.RequiredArgsConstructor;

/**
 * The search box at the top of the console. Operations arrives knowing a name, an email, a phone or
 * an id read out over the phone, so every one of those finds its record - a few of each kind.
 */
@Service
@RequiredArgsConstructor
public class AdminSearch {

    private static final int EACH = 5;

    private final NamedParameterJdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<SearchHit> search(String raw) {
        String q = raw == null ? "" : raw.trim();
        if (q.length() < 2) {
            return List.of();
        }
        var params = new MapSqlParameterSource()
                .addValue("like", "%" + q + "%")
                // Ids are shown shortened in the console, so an id search matches its tail too.
                .addValue("id", "%" + q.toUpperCase() + "%")
                .addValue("each", EACH);

        List<SearchHit> hits = new ArrayList<>();
        hits.addAll(jdbc.query("""
                SELECT r.id, u.email, CONCAT_WS(' ', u.first_name, u.last_name) AS name, u.phone
                  FROM rider_profiles r JOIN users u ON u.id = r.user_id
                 WHERE u.email ILIKE :like OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE :like OR u.phone ILIKE :like
                 LIMIT :each
                """, params, (rs, n) -> new SearchHit("RIDER", rs.getString("id"),
                label(rs.getString("name"), rs.getString("email")), rs.getString("email"))));
        hits.addAll(jdbc.query("""
                SELECT d.id, u.email, CONCAT_WS(' ', u.first_name, u.last_name) AS name
                  FROM driver_profiles d JOIN users u ON u.id = d.user_id
                 WHERE u.email ILIKE :like OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE :like OR u.phone ILIKE :like
                 LIMIT :each
                """, params, (rs, n) -> new SearchHit("DRIVER", rs.getString("id"),
                label(rs.getString("name"), rs.getString("email")), rs.getString("email"))));
        hits.addAll(jdbc.query("""
                SELECT id, pickup_address, destination_address, status FROM ride_requests
                 WHERE id ILIKE :id ORDER BY requested_at DESC LIMIT :each
                """, params, (rs, n) -> new SearchHit("RIDE", rs.getString("id"),
                "Ride " + tail(rs.getString("id")), rs.getString("pickup_address") + " → " + rs.getString("destination_address"))));
        hits.addAll(jdbc.query("""
                SELECT id, net_amount_minor, currency, status FROM payments
                 WHERE id ILIKE :id OR provider_payment_id ILIKE :like ORDER BY created_at DESC LIMIT :each
                """, params, (rs, n) -> new SearchHit("PAYMENT", rs.getString("id"),
                "Payment " + tail(rs.getString("id")),
                rs.getString("currency") + " " + rs.getLong("net_amount_minor") / 100.0 + " · " + rs.getString("status"))));
        hits.addAll(jdbc.query("""
                SELECT id, code, name FROM routes WHERE code ILIKE :like OR name ILIKE :like LIMIT :each
                """, params, (rs, n) -> new SearchHit("ROUTE", rs.getString("id"), rs.getString("name"), rs.getString("code"))));
        hits.addAll(jdbc.query("""
                SELECT id, subject, status FROM support_tickets
                 WHERE id ILIKE :id OR subject ILIKE :like ORDER BY created_at DESC LIMIT :each
                """, params, (rs, n) -> new SearchHit("CASE", rs.getString("id"), rs.getString("subject"),
                "Case " + tail(rs.getString("id")) + " · " + rs.getString("status"))));
        return hits;
    }

    private static String label(String name, String email) {
        return name == null || name.isBlank() ? email : name;
    }

    private static String tail(String id) {
        return id.length() > 8 ? id.substring(id.length() - 8) : id;
    }
}
