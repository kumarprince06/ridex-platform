package com.ridex.legal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.ridex.legal.dto.UpdateLegalDocumentRequest;
import com.ridex.shared.exception.NotFoundException;

class LegalDocumentServiceTest {

    private final LegalDocumentRepository repository = mock(LegalDocumentRepository.class);
    private final LegalDocumentService service = new LegalDocumentService(repository);

    @Test
    void anEditRecordsTheTextAndWhoChangedIt() {
        LegalDocument document = new LegalDocument();
        document.setSlug("privacy-policy");
        when(repository.findById("privacy-policy")).thenReturn(Optional.of(document));
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));

        var saved = service.update("privacy-policy", new UpdateLegalDocumentRequest(" Privacy ", "# New"), "admin-1");

        assertThat(saved.title()).isEqualTo("Privacy");
        assertThat(saved.body()).isEqualTo("# New");
        assertThat(document.getUpdatedBy()).isEqualTo("admin-1");
    }

    @Test
    void anUnknownDocumentIsNotFound() {
        when(repository.findById("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get("nope")).isInstanceOf(NotFoundException.class);
    }
}
