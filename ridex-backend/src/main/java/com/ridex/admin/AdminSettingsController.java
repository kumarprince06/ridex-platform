package com.ridex.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.SettingResponse;
import com.ridex.admin.dto.UpdateSettingRequest;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.platform.settings.PlatformSetting;
import com.ridex.platform.settings.SettingsService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Platform values operations can change without a deploy: point rewards, the redemption rate, the
 * platform commission.
 *
 * <p>Every change is audited. These numbers decide what people earn and pay, so "who set the
 * commission to 40% last Tuesday" has to be answerable.
 */
@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminSettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<SettingResponse> all() {
        return settingsService.all().stream().map(AdminSettingsController::toResponse).toList();
    }

    @Audited(action = "SETTING_CHANGED", targetType = "SETTING")
    @PutMapping("/{key}")
    @ResponseStatus(HttpStatus.OK)
    public SettingResponse update(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String key, @Valid @RequestBody UpdateSettingRequest request) {
        return toResponse(settingsService.update(key, request.value(), principal.userId()));
    }

    private static SettingResponse toResponse(PlatformSetting setting) {
        return new SettingResponse(
                setting.getKey(), setting.getValue(), setting.getLabel(), setting.getDescription(),
                setting.getValueType(), setting.getMinValue(), setting.getMaxValue(),
                setting.getUpdatedAt());
    }
}
