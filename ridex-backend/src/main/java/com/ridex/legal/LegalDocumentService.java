package com.ridex.legal;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.legal.dto.LegalDocumentResponse;
import com.ridex.legal.dto.UpdateLegalDocumentRequest;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LegalDocumentService {

    private final LegalDocumentRepository repository;

    @Transactional(readOnly = true)
    public LegalDocumentResponse get(String slug) {
        return LegalDocumentResponse.of(require(slug));
    }

    @Transactional(readOnly = true)
    public List<LegalDocumentResponse> all() {
        return repository.findAllByOrderBySlugAsc().stream().map(LegalDocumentResponse::of).toList();
    }

    // Edits only: the set of documents is fixed by migration, so the apps never link to a slug
    // that an admin could delete.
    @Transactional
    public LegalDocumentResponse update(String slug, UpdateLegalDocumentRequest request, String actorUserId) {
        LegalDocument document = require(slug);
        document.setTitle(request.title().trim());
        document.setBody(request.body());
        document.setUpdatedBy(actorUserId);
        return LegalDocumentResponse.of(repository.saveAndFlush(document));
    }

    private LegalDocument require(String slug) {
        return repository.findById(slug).orElseThrow(() -> new NotFoundException("No such document."));
    }
}
