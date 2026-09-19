package com.ridex.legal;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, String> {

    List<LegalDocument> findAllByOrderBySlugAsc();
}
