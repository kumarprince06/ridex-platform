package com.ridex.legal;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.ridex.legal.dto.LegalDocumentResponse;

import lombok.RequiredArgsConstructor;

/** Public: the Welcome screen links to these before anybody has signed in. */
@RestController
@RequestMapping("/api/v1/legal")
@RequiredArgsConstructor
public class LegalController {

    private final LegalDocumentService legalDocumentService;

    /** One document by its slug: partner-terms, rider-terms or privacy-policy. */
    @GetMapping("/{slug}")
    @ResponseStatus(HttpStatus.OK)
    public LegalDocumentResponse get(@PathVariable String slug) {
        return legalDocumentService.get(slug);
    }
}
