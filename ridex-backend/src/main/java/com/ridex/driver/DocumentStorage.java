package com.ridex.driver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.util.UlidGenerator;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Where a KYC document's bytes live.
 *
 * <p>An object store when one is configured, the application's own disk otherwise. The disk path
 * is for development: a container's filesystem is wiped on every redeploy, so a deployment that
 * keeps documents needs the bucket. Callers only ever handle the returned key either way.
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

    /** Empty in development, which is what selects the disk. */
    @Value("${app.documents.bucket.url:}")
    private String bucketUrl;

    /** Supabase's service role key. It bypasses row level security, so it never leaves the server. */
    @Value("${app.documents.bucket.key:}")
    private String bucketKey;

    @Value("${app.documents.bucket.name:documents}")
    private String bucketName;

    private RestClient http;

    @PostConstruct
    void announceBackend() {
        if (usingBucket()) {
            http = RestClient.builder().baseUrl(bucketUrl).build();
            log.info("KYC documents are stored in the {} bucket", bucketName);
        } else {
            log.warn("KYC documents are stored on local disk at {} - fine for development, but a "
                    + "redeploy wipes them. Set app.documents.bucket.* to keep them.", directory);
        }
    }

    private boolean usingBucket() {
        return !bucketUrl.isBlank() && !bucketKey.isBlank();
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
            if (usingBucket()) {
                http.post()
                        .uri(objectPath(key))
                        .header("Authorization", "Bearer " + bucketKey)
                        .header("Content-Type", contentType)
                        .body(in.readAllBytes())
                        .retrieve()
                        .toBodilessEntity();
            } else {
                Path target = root().resolve(key);
                Files.createDirectories(target.getParent());
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException | RestClientException e) {
            throw new IllegalStateException("Could not store the document.", e);
        }

        return key;
    }

    public byte[] read(String storageKey) {
        if (usingBucket()) {
            try {
                return http.get()
                        .uri(objectPath(storageKey))
                        .header("Authorization", "Bearer " + bucketKey)
                        .retrieve()
                        .body(byte[].class);
            } catch (RestClientException e) {
                throw new IllegalStateException("Could not read the document.", e);
            }
        }

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

    // The key holds slashes, and a URI template would encode them into %2F - which the bucket
    // reads as one filename rather than a path.
    private String objectPath(String key) {
        return "/storage/v1/object/" + bucketName + "/" + key;
    }

    private Path root() {
        return Path.of(directory).toAbsolutePath().normalize();
    }
}
