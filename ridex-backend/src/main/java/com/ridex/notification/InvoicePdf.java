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

import org.springframework.stereotype.Component;

/**
 * One-page invoice, built from the same "label|value" rows the mail body shows.
 *
 * <p>A booking confirmation is read once; an invoice is filed, forwarded to an employer and
 * claimed against. That is a file, not a page in an app.
 *
 * <p>ponytail: Helvetica and left-aligned rows, no logo and no table borders - a layout engine
 * here would be a rendering library nobody asked for. Upgrade to a template if finance ever needs
 * a specific format.
 */
@Component
public class InvoicePdf {

    private static final float MARGIN = 56f;
    private static final float LINE = 18f;

    public byte[] render(String title, String reference, List<String[]> rows, String footer) {
        try (PDDocument document = new PDDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float y = page.getMediaBox().getHeight() - MARGIN;

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                y = write(content, new PDType1Font(FontName.HELVETICA_BOLD), 18f, MARGIN, y, "RideX");
                y -= LINE * 0.4f;
                y = write(content, new PDType1Font(FontName.HELVETICA), 12f, MARGIN, y, title);
                y = write(content, new PDType1Font(FontName.HELVETICA), 10f, MARGIN, y, reference);
                y -= LINE;

                for (String[] row : rows) {
                    write(content, new PDType1Font(FontName.HELVETICA), 11f, MARGIN, y, row[0]);
                    // Second column at a fixed offset: the values are short, and a measured column
                    // width is a table layout this does not need.
                    y = write(content, new PDType1Font(FontName.HELVETICA_BOLD), 11f,
                            MARGIN + 180f, y, row[1]);
                }

                if (footer != null) {
                    y -= LINE;
                    write(content, new PDType1Font(FontName.HELVETICA), 9f, MARGIN, y, footer);
                }
            }

            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            // The outbox retries on a runtime exception, which is the right answer for a transient
            // failure and a loud one for a broken template.
            throw new IllegalStateException("Could not build the invoice PDF", ex);
        }
    }

    private float write(PDPageContentStream content, PDType1Font font, float size,
            float x, float y, String text) throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        // WinAnsi has no rupee sign and PDFBox throws on it, so the currency reads as a code.
        content.showText(text.replace("₹", "INR "));
        content.endText();
        return y - LINE;
    }
}
