package com.ridex.places;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.places.dto.SavedPlaceRequest;
import com.ridex.places.dto.SavedPlaceResponse;
import com.ridex.platform.security.JwtPrincipal;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Home, work and anywhere else a rider goes often enough to name. */
@RestController
@RequestMapping("/api/v1/rider/places")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RIDER')")
public class SavedPlaceController {

    private final SavedPlaceService savedPlaceService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<SavedPlaceResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return savedPlaceService.mine(principal.userId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public SavedPlaceResponse save(@AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody SavedPlaceRequest request) {
        return savedPlaceService.save(principal.userId(), request);
    }

    @DeleteMapping("/{placeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String placeId) {
        savedPlaceService.delete(principal.userId(), placeId);
    }
}
