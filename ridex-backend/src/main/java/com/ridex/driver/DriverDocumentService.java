package com.ridex.driver;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.ridex.auth.UserRepository;
import com.ridex.driver.domain.DriverDocument;
import com.ridex.driver.domain.DriverDocumentStatus;
import com.ridex.driver.domain.DriverDocumentType;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.driver.dto.DriverDocumentResponse;
import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.Notifier;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverDocumentService {

    private final DriverDocumentRepository driverDocumentRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final DocumentStorage documentStorage;
    private final Notifier notifier;

    @Transactional(readOnly = true)
    public List<DriverDocumentResponse> mine(String driverUserId) {
        return driverDocumentRepository
                .findByDriverIdOrderByCreatedAtDesc(requireDriver(driverUserId).getId())
                .stream().map(DriverDocumentResponse::of).toList();
    }

    /**
     * Uploads or replaces one document.
     *
     * <p>One row per type, replaced in place. A driver who re-uploads a licence after a rejection
     * is correcting the same document, and keeping both would leave a reviewer looking at a
     * rejected row next to a pending one with no way to tell which is current.
     */
    @Transactional
    public DriverDocumentResponse submit(String driverUserId, DriverDocumentType type,
            Instant expiresAt, MultipartFile file) {
        DriverProfile driver = requireDriver(driverUserId);

        // Checked before the bytes are written, so a lapsed date cannot leave an orphan file.
        if (expiresAt != null && expiresAt.isBefore(Instant.now())) {
            throw new ValidationException("That document has already expired.");
        }

        String storageKey = documentStorage.put(driver.getId(), file);

        DriverDocument document = driverDocumentRepository
                .findByDriverIdAndDocumentType(driver.getId(), type)
                .orElseGet(() -> {
                    DriverDocument fresh = new DriverDocument();
                    fresh.setDriver(driver);
                    fresh.setDocumentType(type);
                    return fresh;
                });

        document.setStorageKey(storageKey);
        document.setExpiresAt(expiresAt);
        // A replacement is a new submission: the previous decision was about the previous file.
        document.setStatus(DriverDocumentStatus.PENDING_REVIEW);
        document.setReviewedAt(null);
        document.setReviewedBy(null);
        document.setReviewNotes(null);

        return DriverDocumentResponse.of(driverDocumentRepository.save(document));
    }

    /** Which required documents this driver has not yet submitted. Empty means ready for review. */
    @Transactional(readOnly = true)
    public List<DriverDocumentType> missingForReview(String driverId) {
        List<DriverDocumentType> held = driverDocumentRepository
                .findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(DriverDocument::getDocumentType).toList();

        return Arrays.stream(DriverDocumentType.values())
                .filter(DriverDocumentType::isRequiredForReview)
                .filter(type -> !held.contains(type))
                .toList();
    }

    /** Every required document approved and unexpired. This is what gates driving, not status. */
    @Transactional(readOnly = true)
    public boolean hasValidRequiredDocuments(String driverId) {
        Instant now = Instant.now();
        List<DriverDocument> documents =
                driverDocumentRepository.findByDriverIdOrderByCreatedAtDesc(driverId);

        return Arrays.stream(DriverDocumentType.values())
                .filter(DriverDocumentType::isRequiredForReview)
                .allMatch(type -> documents.stream()
                        .anyMatch(d -> d.getDocumentType() == type && d.isValidAt(now)));
    }

    @Transactional(readOnly = true)
    public List<DriverDocumentResponse> awaitingReview() {
        return driverDocumentRepository
                .findByStatusOrderByCreatedAtAsc(DriverDocumentStatus.PENDING_REVIEW)
                .stream().map(DriverDocumentResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public List<DriverDocumentResponse> forDriver(String driverId) {
        return driverDocumentRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(DriverDocumentResponse::of).toList();
    }

    @Transactional
    public DriverDocumentResponse review(String documentId, String reviewerUserId,
            boolean approved, String notes) {
        DriverDocument document = driverDocumentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("No such document."));

        if (!approved && (notes == null || notes.isBlank())) {
            throw new ValidationException("A rejection needs a reason the driver can act on.");
        }

        document.setStatus(approved
                ? DriverDocumentStatus.APPROVED
                : DriverDocumentStatus.REJECTED);
        document.setReviewedAt(Instant.now());
        userRepository.findById(reviewerUserId).ifPresent(document::setReviewedBy);
        document.setReviewNotes(notes);

        // The rejection carries the reason; the approval names the document, because a driver with
        // five in the queue cannot tell which one was cleared from "Document approved" alone.
        notifier.enqueue(DeliveryChannel.EMAIL,
                document.getDriver().getUser().getEmail(),
                approved ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
                approved ? readable(document.getDocumentType()) : notes);

        return DriverDocumentResponse.of(driverDocumentRepository.save(document));
    }

    /** Serves the bytes to a reviewer. Never a URL - access is brokered on every read. */
    @Transactional(readOnly = true)
    public byte[] contents(String documentId) {
        return documentStorage.read(driverDocumentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("No such document."))
                .getStorageKey());
    }

    /**
     * Flips approved documents past their expiry to EXPIRED.
     *
     * <p>Hourly rather than on read: a driver mid-shift whose licence lapses at midnight should
     * stop being eligible on their own, without waiting for somebody to open their profile.
     */
    @Scheduled(fixedDelayString = "${app.documents.expiry-sweep-ms:3600000}")
    @Transactional
    public void expireLapsedDocuments() {
        List<DriverDocument> lapsed = driverDocumentRepository.findLapsed(Instant.now());
        if (lapsed.isEmpty()) {
            return;
        }
        lapsed.forEach(document -> document.setStatus(DriverDocumentStatus.EXPIRED));
        driverDocumentRepository.saveAll(lapsed);
        log.info("Expired {} lapsed driver documents", lapsed.size());
    }

    private static String readable(DriverDocumentType type) {
        return type.name().toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
    }

    private DriverProfile requireDriver(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }
}
