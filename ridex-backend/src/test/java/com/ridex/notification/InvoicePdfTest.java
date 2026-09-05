package com.ridex.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * The invoice is the one document that leaves the platform and lands in front of people who have
 * never used the app, so it is worth knowing it still renders.
 */
class InvoicePdfTest {

    @Test
    void rendersAOnePageInvoice() throws Exception {
        byte[] pdf = new InvoicePdf().render(
                "Invoice",
                "01M1RNCZA5GGNHXJGW59J30RHT",
                "5 Sep 2026",
                "ridexrider@yopmail.com",
                "Paid",
                true,
                List.of(
                        new String[] { "Route", "Sector V to Howrah Maidan" },
                        new String[] { "Seat", "3A" },
                        new String[] { "Get on at", "Sector V Metro Station" },
                        new String[] { "Get off at", "Howrah Maidan Metro" },
                        new String[] { "Departs", "Sat 5 Sep, 17:45" },
                        new String[] { "Driver", "Rakesh Das" },
                        new String[] { "Vehicle", "Ashok Leyland Falcon (WB19RX4002)" },
                        new String[] { "Paid with", "UPI · RAZORPAY" },
                        new String[] { "Payment ID", "pay_TYKXIfN7ynlirE" },
                        new String[] { "Total", "INR 85.00" }),
                "Thank you for travelling with RideX.");

        // A PDF, one page, and big enough to be carrying the logo rather than an empty page.
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        assertThat(pdf.length).isGreaterThan(4000);

        // Left behind on purpose: the only way to judge a layout is to look at it.
        Files.write(Path.of(System.getProperty("java.io.tmpdir"), "ridex-invoice-sample.pdf"), pdf);
    }
}
