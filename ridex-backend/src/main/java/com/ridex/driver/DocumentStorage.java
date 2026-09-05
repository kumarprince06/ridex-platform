package com.ridex.driver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.util.UlidGenerator;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Where a KYC document's bytes live.
 *
 * <p>ponytail: writes to a directory on the application's own disk. Production needs S3 or
 * equivalent - a second node cannot read this one's filesystem, and nothing here is encrypted at
 * rest or replicated. The rest of the codebase only ever handles the returned key, so swapping the
 * body of these two methods for an S3 client changes nothing above it.
 */
@Slf4j
@Component
public class DocumentStorage {

    // Deliberately short. These are photographs of a licence, not scans of a book.
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    private static final java.util.Set<String> ALLOWED_TYPES =
            java.util.Set.of("image/jpeg", "image/png", "image/heic", "application/pdf");

    @Value("${app.documents.directory:./var/documents}")
    private String directory;

    @PostConstruct
    void warnAboutLocalDisk() {
        log.warn("KYC documents are stored on local disk at {} - not suitable beyond one node. "
                + "Swap DocumentStorage for an object store before deploying.", directory);
    }

    /** @return the storage key to persist. Never a URL: access to the file is brokered. */
    public String put(String driverId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new ValidationException("The uploaded file is empty.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ValidationException("A document must be 8 MB or smaller.");
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new ValidationException("A document must be a JPEG, PNG, HEIC or PDF.");
        }

        // The key carries no original filename: an attacker-supplied name is how a path traversal
        // gets in, and the name tells a reviewer nothing the document type does not.
        String key = "drivers/%s/%s".formatted(driverId, UlidGenerator.generateUlid());

        try (InputStream in = file.getInputStream()) {
            Path target = root().resolve(key);
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store the document.", e);
        }

        return key;
    }

    public byte[] read(String storageKey) {
        Path target = root().resolve(storageKey).normalize();
        // Belt and braces: a key from the database should never escape the root, and if one ever
        // did this is the line that stops it serving /etc/passwd.
        if (!target.startsWith(root())) {
            throw new ValidationException("That document key is not valid.");
        }
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the document.", e);
        }
    }

    private Path root() {
        return Path.of(directory).toAbsolutePath().normalize();
    }
}
