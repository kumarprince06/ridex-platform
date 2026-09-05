package com.ridex.driver;

import java.time.Instant;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.driver.dto.DriverDocumentResponse;
import com.ridex.platform.security.JwtPrincipal;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver/documents")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverDocumentController {

    private final DriverDocumentService driverDocumentService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<DriverDocumentResponse> mine(@AuthenticationPrincipal JwtPrincipal principal) {
        return driverDocumentService.mine(principal.userId());
    }

    /** Multipart, because the file is the point. Re-uploading a type replaces it and re-queues it. */
    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public DriverDocumentResponse submit(
            @AuthenticationPrincipal JwtPrincipal principal,
            @RequestParam DriverDocumentType documentType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            Instant expiresAt,
            @RequestPart MultipartFile file) {
        return driverDocumentService.submit(principal.userId(), documentType, expiresAt, file);
    }
}
