package com.ridex.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The shell every email is poured into: masthead, body, footer.
 *
 * <p>ponytail: string concatenation rather than Thymeleaf. There are five messages, all the same
 * shape, and a template engine would be a dependency, a resource loader and a second place to look
 * when the wording is wrong. Add one when a designer needs to edit these without a deploy.
 *
 * <p>Every rule is inlined on the element it styles. Gmail strips {@code <style>} blocks and
 * Outlook ignores half of what survives, so a stylesheet is the one thing that reliably does not
 * arrive. Tables rather than flexbox, for the same reason.
 */
@Component
public class EmailLayout {

    // The brand values from ridex-*/theme, kept literal: a mail client cannot read a CSS variable.
    private static final String INK = "#101828";
    private static final String MUTED = "#5b6779";
    private static final String FAINT = "#8a94a6";
    private static final String LINE = "#dde3ec";
    private static final String CANVAS = "#f5f7fa";
    private static final String SURFACE = "#ffffff";
    private static final String DARK = "#04241e";
    private static final String PRIMARY_STRONG = "#12a68c";
    private static final String PRIMARY_SURFACE = "#e6fbf6";

    /** Referenced as cid:, so the logo shows without the client fetching anything. */
    public static final String LOGO_CID = "ridex-logo";

    @Value("${app.mail.support-address:support@ridex.local}")
    private String supportAddress;

    /**
     * Wraps rendered body HTML.
     *
     * @param preheader the grey line a client shows next to the subject. Left out, it fills itself
     *                  with whatever text comes first, which is usually "View this email".
     */
    public String wrap(String title, String preheader, String bodyHtml) {
        return """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background:%s;">
                  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">%s</div>

                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
                         style="background:%s;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
                               style="max-width:520px;background:%s;border:1px solid %s;border-radius:14px;overflow:hidden;">

                          <tr>
                            <td style="background:%s;padding:22px 28px;">
                              <img src="cid:%s" width="34" alt="RideX"
                                   style="display:block;border:0;outline:none;">
                            </td>
                          </tr>

                          <tr>
                            <td style="padding:28px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;
                                       font-size:15px;line-height:1.55;color:%s;">
                              %s
                            </td>
                          </tr>

                          <tr>
                            <td style="padding:18px 28px 24px;border-top:1px solid %s;
                                       font-family:'Segoe UI',Helvetica,Arial,sans-serif;
                                       font-size:12px;line-height:1.5;color:%s;">
                              Sent by RideX. Questions? Write to
                              <a href="mailto:%s" style="color:%s;text-decoration:none;">%s</a>.
                              <br>
                              This is an automated message - replies to it are not read.
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                escape(title), CANVAS, escape(preheader),
                CANVAS, SURFACE, LINE,
                DARK, LOGO_CID,
                INK, bodyHtml,
                LINE, FAINT,
                supportAddress, PRIMARY_STRONG, supportAddress);
    }

    public String heading(String text) {
        return "<h1 style=\"margin:0 0 12px;font-size:20px;font-weight:600;color:%s;\">%s</h1>"
                .formatted(INK, escape(text));
    }

    public String paragraph(String text) {
        return "<p style=\"margin:0 0 14px;color:%s;\">%s</p>".formatted(MUTED, escape(text));
    }

    /**
     * The code, big enough to read off a lock screen.
     *
     * <p>Letter-spaced and monospaced so 0 and O are distinguishable - a verification code is
     * transcribed by hand, and an ambiguous glyph is a failed signup nobody can explain.
     */
    public String code(String value) {
        return """
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%%"
                       style="margin:4px 0 18px;">
                  <tr>
                    <td align="center" style="background:%s;border-radius:10px;padding:18px 12px;
                               font-family:'SFMono-Regular',Menlo,Consolas,monospace;
                               font-size:30px;font-weight:700;letter-spacing:8px;color:%s;">
                      %s
                    </td>
                  </tr>
                </table>
                """.formatted(PRIMARY_SURFACE, DARK, escape(value));
    }

    /** The quiet line under the code: what to do if this was not you. */
    public String note(String text) {
        return "<p style=\"margin:0;font-size:13px;color:%s;\">%s</p>".formatted(FAINT, escape(text));
    }

    /**
     * Escapes anything that reaches the template from outside.
     *
     * <p>Codes and names are ours today, but an email body is HTML the moment it is opened, and a
     * template that trusts its inputs is one display-name away from injecting markup into it.
     */
    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
