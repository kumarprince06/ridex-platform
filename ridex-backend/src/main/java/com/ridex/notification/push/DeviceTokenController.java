package com.ridex.notification.push;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.ridex.platform.security.JwtPrincipal;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DeviceTokenController {

    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * Registers this device against the signed-in account.
     *
     * <p>Upsert on the token, not insert: the same phone signed in as somebody else must move to
     * the new account rather than keep pushing that account's notices to the previous owner.
     */
    @PutMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void register(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody DeviceTokenRequest request) {
        DeviceToken device = deviceTokenRepository.findByToken(request.token())
                .orElseGet(DeviceToken::new);

        device.setToken(request.token());
        device.setUserId(principal.userId());
        device.setPlatform(request.platform());
        device.setAppContext(request.app());
        device.setLastSeenAt(Instant.now());

        deviceTokenRepository.save(device);
    }

    /** Called on sign-out. A token left behind pushes the last user's notices to whoever signs in. */
    @DeleteMapping("/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void unregister(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String token) {
        deviceTokenRepository.findByToken(token)
                .filter(device -> device.getUserId().equals(principal.userId()))
                .ifPresent(deviceTokenRepository::delete);
    }
}
