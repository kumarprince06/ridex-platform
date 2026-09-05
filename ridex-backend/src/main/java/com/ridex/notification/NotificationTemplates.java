package com.ridex.notification;

import java.util.List;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Wording in one place.
 *
 * <p>ponytail: a switch, not a database table - templates move to the database when operations
 * needs to edit them without a deploy, and not before.
 *
 * <p>Every message renders twice. The HTML is what people see; the plain text is what a client with
 * images off, a screen reader, or a spam filter reads - and a message with no text alternative
 * scores worse on every filter that looks.
 */
@Component
@RequiredArgsConstructor
public class NotificationTemplates {

    private final EmailLayout layout;
    private final InvoicePdf invoicePdf;

    /**
     * @param html null for channels that cannot render it. SMS and push take the text.
     */
    public record Rendered(String subject, String body, String html, Attachment attachment) {

        /** Most messages carry nothing but words. */
        public Rendered(String subject, String body, String html) {
            this(subject, body, html, null);
        }

        public static Rendered text(String subject, String body) {
            return new Rendered(subject, body, null);
        }
    }

    /** A file hung off a message - an invoice somebody can keep, rather than a page they must revisit. */
    public record Attachment(String filename, byte[] bytes, String contentType) {
    }

    /** "Hi Priya, " when there is a name, and "Your " when there is not. */
    private static String greeting(String firstName) {
        return firstName == null || firstName.isBlank() ? "Your " : "Hi " + firstName + ", your ";
    }

    /**
     * A trip receipt.
     *
     * <p>Every line the fare was built from, because "why am I paying this" is the question a
     * receipt exists to answer, and a single total is what makes people ask it.
     */
    private Rendered receipt(String payload) {
        List<String> rows = List.of(payload.split("\n"));
        String total = rows.get(0);
        List<String> lines = rows.subList(1, rows.size());

        String text = lines.stream()
                .map(row -> row.replace('|', ' '))
                .collect(java.util.stream.Collectors.joining("\n"));

        return new Rendered(
                "Your RideX receipt - " + total,
                "Thanks for riding with RideX.\n\n" + text,
                layout.wrap("Your RideX receipt",
                        "Your trip came to " + total + ".",
                        layout.heading("Thanks for riding")
                                + layout.paragraph("Here is what your trip came to, line by line.")
                                + layout.lines(lines)
                                + layout.note("Charged in cash to the driver. Open the app to see the "
                                        + "quoted fare against what was charged.")));
    }

    public Rendered render(OutboxMessage message) {
        String payload = message.getPayload();

        return switch (message.getEventType()) {
            case "VERIFY_ACCOUNT" -> new Rendered(
                    "Your RideX verification code",
                    "Your RideX code is " + payload
                            + ". It expires in 10 minutes. If you did not ask for it, ignore this message.",
                    layout.wrap("Your RideX verification code",
                            "Your code is " + payload + ", valid for 10 minutes.",
                            layout.heading("Confirm your email")
                                    + layout.paragraph("Enter this code in the app to finish setting up your account.")
                                    + layout.code(payload)
                                    + layout.note("It expires in 10 minutes. If you did not ask for it, "
                                            + "you can ignore this message.")));

            case "RESET_PASSWORD" -> new Rendered(
                    "Your RideX password reset code",
                    "Your RideX password reset code is " + payload
                            + ". It expires in 10 minutes. If you did not ask for it, your password is unchanged.",
                    layout.wrap("Your RideX password reset code",
                            "Your reset code is " + payload + ", valid for 10 minutes.",
                            layout.heading("Reset your password")
                                    + layout.paragraph("Enter this code in the app to choose a new password.")
                                    + layout.code(payload)
                                    + layout.note("It expires in 10 minutes. If you did not ask for it, "
                                            + "your password is unchanged and there is nothing to do.")));

            // Sent to the address, not to whoever typed it: it must not confirm that an account
            // exists to somebody probing for one, so it reads as news to the owner.
            case "ACCOUNT_EXISTS" -> new Rendered(
                    "About your RideX account",
                    "Someone tried to create a RideX account with this address, and one already exists. "
                            + "If that was you, sign in instead, or reset your password.",
                    layout.wrap("About your RideX account",
                            "Someone tried to sign up with this address.",
                            layout.heading("You already have an account")
                                    + layout.paragraph("Someone tried to create a RideX account with this "
                                            + "email address, and one already exists.")
                                    + layout.paragraph("If that was you, sign in instead - or use "
                                            + "“Forgot password” if you cannot get in.")
                                    + layout.note("If it was not you, nothing has changed on your account.")));

            case "SHUTTLE_BOOKED" -> new Rendered(
                    "Your seat is booked",
                    "Seat " + payload + ". Show your boarding code to the driver when you get on.",
                    layout.wrap("Your seat is booked",
                            "Seat " + payload + " is confirmed.",
                            layout.heading("Seat " + payload + " is yours")
                                    + layout.paragraph("Your shuttle seat is confirmed. Open the app to see "
                                            + "your boarding code and show it to the driver when you get on.")
                                    + layout.note("The code is in the app only - it is never sent by email.")));

            // Payload: the reference on the first line, then "label|value" rows, the last of
            // which is the total. The same rows render as HTML, as text, and into the PDF, so a
            // fare can never disagree with itself across three copies of the same message.
            case "SHUTTLE_INVOICE" -> {
                List<String> rows = List.of(payload.split("\n"));
                String reference = rows.get(0);
                List<String> lines = rows.subList(1, rows.size());
                String total = lines.get(lines.size() - 1).split("\\|", 2)[1];

                yield new Rendered(
                        "Your RideX shuttle invoice - " + total,
                        "Thanks for booking with RideX.\n\nInvoice " + reference + "\n\n"
                                + lines.stream().map(row -> row.replace('|', ' '))
                                        .collect(java.util.stream.Collectors.joining("\n"))
                                + "\n\nThe same invoice is attached as a PDF.",
                        layout.wrap("Your RideX shuttle invoice",
                                "Your seat came to " + total + ".",
                                layout.heading("Your shuttle invoice")
                                        + layout.paragraph("Here is what your seat came to, line by line. "
                                                + "The same invoice is attached as a PDF you can keep.")
                                        + layout.lines(lines)
                                        + layout.note("Invoice " + reference)),
                        new Attachment(
                                "ridex-invoice-" + reference + ".pdf",
                                invoicePdf.render("Shuttle invoice", "Invoice " + reference,
                                        lines.stream().map(row -> row.split("\\|", 2)).toList(),
                                        "RideX - thank you for travelling with us."),
                                "application/pdf"));
            }

            case "SHUTTLE_BOARDED" -> new Rendered(
                    "You are on board",
                    "Seat " + payload + " is checked in. Have a good trip.",
                    layout.wrap("You are on board",
                            "Seat " + payload + " is checked in.",
                            layout.heading("Checked in")
                                    + layout.paragraph("The driver has checked you into seat " + payload
                                            + ". Have a good trip.")));

            // The payload is the person's first name, or blank - a greeting that says "Hi ,"
            // is worse than one that does not try.
            case "WELCOME" -> new Rendered(
                    "Welcome to RideX",
                    greeting(payload) + "your account is ready. Open the app and book your first ride.",
                    layout.wrap("Welcome to RideX",
                            "Your account is verified and ready to use.",
                            layout.heading("You are all set")
                                    + layout.paragraph(greeting(payload)
                                            + "your email is verified and your RideX account is ready.")
                                    + layout.paragraph("Open the app to book a ride, or a shuttle seat "
                                            + "on one of our commuter routes.")
                                    + layout.note("You are receiving this because you created a RideX "
                                            + "account with this address.")));

            case "DRIVER_UNDER_REVIEW" -> new Rendered(
                    "Your RideX application is with us",
                    "We have your documents. Operations reviews applications within two working days.",
                    layout.wrap("Your RideX application is with us",
                            "Your documents are in the review queue.",
                            layout.heading("Application received")
                                    + layout.paragraph("Your documents are with our operations team. "
                                            + "Most applications are reviewed within two working days.")
                                    + layout.paragraph("You will get an email either way - there is "
                                            + "nothing to do until then.")));

            case "DRIVER_APPROVED" -> new Rendered(
                    "You are approved to drive",
                    "Your RideX driver account is approved. Open the partner app and go on duty to "
                            + "start receiving ride offers.",
                    layout.wrap("You are approved to drive",
                            "Your driver account is approved.",
                            layout.heading("Approved")
                                    + layout.paragraph("Your driver account has been approved. Open the "
                                            + "RideX Partner app and go on duty to start receiving offers.")
                                    + layout.note("Keep your licence and insurance current - offers stop "
                                            + "the moment a document expires.")));

            // The reason is the whole message: a rejection somebody cannot act on is a driver lost
            // for a reason nobody recorded.
            case "DRIVER_REJECTED" -> new Rendered(
                    "About your RideX application",
                    "Your application was not approved. Reason: " + payload
                            + ". You can fix this and submit again.",
                    layout.wrap("About your RideX application",
                            "Your application was not approved.",
                            layout.heading("We could not approve your application")
                                    + layout.paragraph("Our operations team reviewed it and could not "
                                            + "approve it yet. Here is why:")
                                    + layout.quote(payload)
                                    + layout.paragraph("Fix what is above, upload the document again in "
                                            + "the app, and submit for review.")));

            case "DRIVER_SUSPENDED" -> new Rendered(
                    "Your RideX driver account is suspended",
                    "Your account has been suspended and you are off duty. Reason: " + payload,
                    layout.wrap("Your RideX driver account is suspended",
                            "Your account has been suspended.",
                            layout.heading("Your account is suspended")
                                    + layout.paragraph("You have been taken off duty and will not "
                                            + "receive offers. Here is why:")
                                    + layout.quote(payload)
                                    + layout.note("Any trip already in progress is unaffected. Reply to "
                                            + "support if you think this is a mistake.")));

            case "DOCUMENT_APPROVED" -> new Rendered(
                    "Document approved",
                    "Your " + payload + " has been approved.",
                    layout.wrap("Document approved",
                            "Your " + payload + " has been approved.",
                            layout.heading("Document approved")
                                    + layout.paragraph("Your " + payload + " has been checked and "
                                            + "approved. Nothing further is needed for it.")));

            case "DOCUMENT_REJECTED" -> new Rendered(
                    "A document needs your attention",
                    "One of your documents was rejected. Reason: " + payload
                            + ". Upload a replacement in the app.",
                    layout.wrap("A document needs your attention",
                            "One of your documents was rejected.",
                            layout.heading("Document not accepted")
                                    + layout.paragraph("One of your documents could not be accepted. "
                                            + "Here is why:")
                                    + layout.quote(payload)
                                    + layout.paragraph("Upload a replacement in the app and it goes "
                                            + "straight back into the review queue.")));

            // The payload is the whole receipt, newline separated: the first line is the total,
            // the rest are "Label|amount". Packing it into the outbox row keeps the dispatcher
            // free of joins - it renders what it was handed, hours later if the relay was down.
            case "RIDE_RECEIPT" -> receipt(payload);

            default -> throw new IllegalStateException("No template for " + message.getEventType());
        };
    }
}
