package com.ridex.admin;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.legal.LegalDocumentService;
import com.ridex.legal.dto.LegalDocumentResponse;
import com.ridex.legal.dto.UpdateLegalDocumentRequest;
import com.ridex.platform.security.JwtPrincipal;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Terms and privacy text. Audited: "what did the terms say when this rider signed up" matters. */
@RestController
@RequestMapping("/api/v1/admin/legal")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminLegalController {

    private final LegalDocumentService legalDocumentService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<LegalDocumentResponse> all() {
        return legalDocumentService.all();
    }

    @Audited(action = "LEGAL_DOCUMENT_CHANGED", targetType = "LEGAL_DOCUMENT")
    @PutMapping("/{slug}")
    @ResponseStatus(HttpStatus.OK)
    public LegalDocumentResponse update(@AuthenticationPrincipal JwtPrincipal principal,
            @PathVariable String slug, @Valid @RequestBody UpdateLegalDocumentRequest request) {
        return legalDocumentService.update(slug, request, principal.userId());
    }
}
