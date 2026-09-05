package com.ridex.notification;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * The invoice, in the brand's own clothes.
 *
 * <p>A receipt gets forwarded to an employer and filed against an expense claim, so it is the one
 * document from this platform that lands in front of people who have never used the app. A page of
 * plain left-aligned rows says nothing about who sent it.
 *
 * <p>ponytail: drawn with primitives rather than an HTML-to-PDF renderer. A headless browser to
 * lay out fifteen lines is a hundred megabytes of dependency and a second per invoice.
 */
@Component
public class InvoicePdf {

    /** On the classpath, and white-on-transparent, which is why the header band behind it is ink. */
    private static final String LOGO_PATH = "mail/logo.png";

    // The app's own palette, so a printed invoice and the screen it came from are the same brand.
    private static final float[] INK = rgb(0x0B, 0x0F, 0x1A);
    private static final float[] MINT = rgb(0x2E, 0xE7, 0xC7);
    private static final float[] MUTED = rgb(0x6B, 0x72, 0x80);
    private static final float[] AMBER = rgb(0xD9, 0xA0, 0x5B);
    private static final float[] HAIRLINE = rgb(0xE5, 0xE7, 0xEB);
    private static final float[] TINT = rgb(0xF7, 0xF8, 0xFA);
    private static final float[] WHITE = rgb(0xFF, 0xFF, 0xFF);

    private static final float MARGIN = 48f;
    private static final float BAND = 116f;
    private static final float ROW = 26f;

    private final PDType1Font regular = new PDType1Font(FontName.HELVETICA);
    private final PDType1Font bold = new PDType1Font(FontName.HELVETICA_BOLD);

    /**
     * @param rows label/value pairs; the last is treated as the total and given its own block
     * @param billedTo who it is addressed to - an invoice with no addressee is not one
     */
    /**
     * @param paid whether the money has actually been taken; an unpaid invoice must say so on its
     *        face, because the difference is the whole reason somebody files one
     */
    public byte[] render(String title, String reference, String issuedOn, String billedTo,
            String paymentStatus, boolean paid, List<String[]> rows, String footer) {
        try (PDDocument document = new PDDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float width = page.getMediaBox().getWidth();
            float height = page.getMediaBox().getHeight();
            float right = width - MARGIN;

            try (PDPageContentStream can = new PDPageContentStream(document, page)) {
                header(document, can, width, height, title, reference);
                statusPill(can, right, height - BAND - 6f, paymentStatus, paid);

                float y = height - BAND - 44f;
                y = addressBlock(can, y, right, billedTo, issuedOn);

                // Every row but the last: the last one is the money, and it gets its own band.
                List<String[]> lines = rows.subList(0, Math.max(0, rows.size() - 1));
                y = detailRows(can, y, right, lines);

                if (!rows.isEmpty()) {
                    y = totalBand(can, y, width, right, rows.get(rows.size() - 1));
                }

                footer(can, y, width, right, footer);
            }

            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            // A runtime exception here means the outbox retries, which is right for a transient
            // failure and loud for a broken template.
            throw new IllegalStateException("Could not build the invoice PDF", ex);
        }
    }

    private void header(PDDocument document, PDPageContentStream can, float width, float height,
            String title, String reference) throws IOException {
        fill(can, MINT, 0, height - 4f, width, 4f);
        fill(can, INK, 0, height - BAND, width, BAND - 4f);

        float logoHeight = 34f;
        try {
            PDImageXObject logo = PDImageXObject.createFromByteArray(document,
                    new ClassPathResource(LOGO_PATH).getContentAsByteArray(), "logo");
            float logoWidth = logoHeight * logo.getWidth() / logo.getHeight();
            can.drawImage(logo, MARGIN, height - BAND + 46f, logoWidth, logoHeight);
            text(can, "RideX", bold, 19f, MARGIN + logoWidth + 12f, height - BAND + 55f, WHITE);
        } catch (IOException missing) {
            // A missing logo is not a reason to fail an invoice somebody is waiting for.
            text(can, "RideX", bold, 19f, MARGIN, height - BAND + 55f, WHITE);
        }

        rightText(can, title.toUpperCase(), bold, 12f, width - MARGIN, height - BAND + 58f, MINT);
        rightText(can, reference, regular, 8.5f, width - MARGIN, height - BAND + 42f, HAIRLINE);
    }

    /** The one thing a reader looks for before anything else: has this been paid or not. */
    private void statusPill(PDPageContentStream can, float right, float y, String label,
            boolean paid) throws IOException {
        if (label == null || label.isBlank()) {
            return;
        }

        String text = safe(label.toUpperCase());
        float size = 9f;
        float textWidth = bold.getStringWidth(text) / 1000f * size;
        float padding = 10f;
        float pillWidth = textWidth + padding * 2;
        float pillHeight = 20f;

        fill(can, paid ? MINT : AMBER, right - pillWidth, y - pillHeight, pillWidth, pillHeight);
        text(can, text, bold, size, right - pillWidth + padding, y - pillHeight + 6.5f,
                paid ? INK : WHITE);
    }

    private float addressBlock(PDPageContentStream can, float y, float right, String billedTo,
            String issuedOn) throws IOException {
        text(can, "BILLED TO", bold, 8f, MARGIN, y, MUTED);
        rightText(can, "ISSUED", bold, 8f, right, y, MUTED);

        text(can, billedTo == null ? "-" : billedTo, regular, 11f, MARGIN, y - 16f, INK);
        rightText(can, issuedOn == null ? "-" : issuedOn, regular, 11f, right, y - 16f, INK);

        return y - 46f;
    }

    private float detailRows(PDPageContentStream can, float y, float right, List<String[]> rows)
            throws IOException {
        for (int index = 0; index < rows.size(); index++) {
            // Banded, so an eye running across a wide row lands on the right value.
            if (index % 2 == 0) {
                fill(can, TINT, MARGIN - 10f, y - 8f, right - MARGIN + 20f, ROW);
            }
            text(can, rows.get(index)[0], regular, 10.5f, MARGIN, y, MUTED);
            rightText(can, rows.get(index)[1], bold, 10.5f, right, y, INK);
            y -= ROW;
        }
        return y - 14f;
    }

    private float totalBand(PDPageContentStream can, float y, float width, float right,
            String[] total) throws IOException {
        float bandHeight = 44f;
        fill(can, INK, MARGIN - 10f, y - bandHeight + 16f, right - MARGIN + 20f, bandHeight);

        text(can, total[0].toUpperCase(), bold, 10f, MARGIN, y - 10f, MINT);
        rightText(can, total[1], bold, 16f, right, y - 14f, WHITE);

        return y - bandHeight - 24f;
    }

    private void footer(PDPageContentStream can, float y, float width, float right, String note)
            throws IOException {
        fill(can, HAIRLINE, MARGIN, y, right - MARGIN, 0.7f);

        if (note != null) {
            text(can, note, regular, 9f, MARGIN, y - 18f, MUTED);
        }
        text(can, "This is a computer-generated invoice and needs no signature.",
                regular, 8f, MARGIN, y - 32f, MUTED);
    }

    private void fill(PDPageContentStream can, float[] colour, float x, float y, float w, float h)
            throws IOException {
        can.setNonStrokingColor(colour[0], colour[1], colour[2]);
        can.addRect(x, y, w, h);
        can.fill();
    }

    private void text(PDPageContentStream can, String value, PDType1Font font, float size,
            float x, float y, float[] colour) throws IOException {
        can.beginText();
        can.setFont(font, size);
        can.setNonStrokingColor(colour[0], colour[1], colour[2]);
        can.newLineAtOffset(x, y);
        can.showText(safe(value));
        can.endText();
    }

    /** Right-aligned, which needs the width measured: the money column has to line up. */
    private void rightText(PDPageContentStream can, String value, PDType1Font font, float size,
            float rightEdge, float y, float[] colour) throws IOException {
        String content = safe(value);
        float width = font.getStringWidth(content) / 1000f * size;
        text(can, content, font, size, rightEdge - width, y, colour);
    }

    /** WinAnsi has no rupee sign and PDFBox throws on it, so the currency reads as its code. */
    private static String safe(String value) {
        return value == null ? "" : value.replace("₹", "INR ");
    }

    private static float[] rgb(int r, int g, int b) {
        return new float[] { r / 255f, g / 255f, b / 255f };
    }
}
