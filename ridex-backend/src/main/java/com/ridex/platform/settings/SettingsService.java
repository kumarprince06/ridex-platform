package com.ridex.platform.settings;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Values operations can change without a deploy.
 *
 * <p>Every read takes a fallback. A missing row is never an outage - it means nobody has
 * overridden the default yet, and a pricing engine that throws because a settings row is absent
 * would be a worse failure than the wrong number.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettingsService {

    // Read on nearly every fare calculation, written a few times a year. ponytail: a plain map,
    // invalidated on write. A cache library earns its place when there are many nodes; with one,
    // this is the whole feature.
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    private final PlatformSettingRepository settingRepository;

    @Transactional(readOnly = true)
    public int getInt(String key, int fallback) {
        String raw = get(key);
        try {
            return raw == null ? fallback : Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            log.warn("Setting {} is not an integer ({}), using {}", key, raw, fallback);
            return fallback;
        }
    }

    @Transactional(readOnly = true)
    public BigDecimal getDecimal(String key, BigDecimal fallback) {
        String raw = get(key);
        try {
            return raw == null ? fallback : new BigDecimal(raw.trim());
        } catch (NumberFormatException ex) {
            log.warn("Setting {} is not a number ({}), using {}", key, raw, fallback);
            return fallback;
        }
    }

    @Transactional(readOnly = true)
    public List<PlatformSetting> all() {
        return settingRepository.findAllByOrderByKeyAsc();
    }

    /** Validated against the row's own bounds, so a typo cannot set a reward to a million. */
    @Transactional
    public PlatformSetting update(String key, String value, String actorUserId) {
        PlatformSetting setting = settingRepository.findById(key)
                .orElseThrow(() -> new NotFoundException("No such setting."));

        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new ValidationException("A value is required.");
        }

        BigDecimal parsed;
        try {
            parsed = new BigDecimal(trimmed);
        } catch (NumberFormatException ex) {
            throw new ValidationException("That value is not a number.");
        }

        if (setting.getMinValue() != null && parsed.compareTo(setting.getMinValue()) < 0) {
            throw new ValidationException("Minimum is " + setting.getMinValue().stripTrailingZeros().toPlainString());
        }
        if (setting.getMaxValue() != null && parsed.compareTo(setting.getMaxValue()) > 0) {
            throw new ValidationException("Maximum is " + setting.getMaxValue().stripTrailingZeros().toPlainString());
        }
        if ("INTEGER".equals(setting.getValueType()) && parsed.stripTrailingZeros().scale() > 0) {
            throw new ValidationException("This setting must be a whole number.");
        }

        setting.setValue(trimmed);
        setting.setUpdatedBy(actorUserId);
        settingRepository.save(setting);

        // Changing what a point is worth must not change what somebody already redeemed: only
        // future reads see this. Past entries are immutable rows, not recalculations.
        cache.put(key, trimmed);
        return setting;
    }

    private String get(String key) {
        return cache.computeIfAbsent(key, k ->
                settingRepository.findById(k).map(PlatformSetting::getValue).orElse(""))
                .isEmpty() ? null : cache.get(key);
    }
}
