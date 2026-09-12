///usr/bin/env java --source 21 "$0" "$@"; exit $?
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Writes the documents that describe the code, from the code.
 *
 * <p>The API contract, the ERD and the notification matrix were all written by hand once and then
 * drifted: 90 of 137 endpoints were missing from the contract, 28 of 47 tables from the ERD, and
 * the matrix listed events the platform has never sent. A document maintained in two places is a
 * document that disagrees with itself; these three are generated so they can only be as wrong as
 * the last run.
 *
 * <pre>
 *   java tools/DocGen.java api           &gt; docs/10-API-Contract.md
 *   java tools/DocGen.java erd           &gt; docs/09-Project-ERD.md
 *   java tools/DocGen.java notifications &gt; docs/12-Notification-Matrix.md
 * </pre>
 */
public final class DocGen {

    private static final Path ROOT = Path.of(".");
    private static final Path BACKEND = ROOT.resolve("ridex-backend/src/main/java/com/ridex");
    private static final Path MIGRATIONS =
            ROOT.resolve("ridex-backend/src/main/resources/db/migration");

    public static void main(String[] args) throws IOException {
        String what = args.length > 0 ? args[0] : "api";
        switch (what) {
            case "api" -> new ApiContract().print();
            case "erd" -> new Erd().print();
            case "notifications" -> new NotificationMatrix().print();
            default -> {
                System.err.println("Usage: java tools/DocGen.java api|erd|notifications");
                System.exit(2);
            }
        }
    }

    /** Files under a directory, in a stable order, so two runs produce the same document. */
    private static List<Path> javaFiles(Path root, String suffix) throws IOException {
        try (Stream<Path> walk = Files.walk(root)) {
            return walk.filter(path -> path.getFileName().toString().endsWith(suffix))
                    .sorted()
                    .toList();
        }
    }

    private static String read(Path path) {
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read " + path, e);
        }
    }

    /** The commit the document was generated from, so a stale one can be spotted. */
    private static String revision() {
        try {
            Process git = new ProcessBuilder("git", "rev-parse", "--short", "HEAD").start();
            String out = new String(git.getInputStream().readAllBytes()).trim();
            return out.isEmpty() ? "unknown" : out;
        } catch (IOException e) {
            return "unknown";
        }
    }

    private static void header(String title, String lead, String command) {
        System.out.println("# " + title);
        System.out.println();
        System.out.println(lead);
        System.out.println();
        System.out.println("Generated from the code rather than maintained by hand:");
        System.out.println();
        System.out.println("```bash");
        System.out.println(command);
        System.out.println("```");
        System.out.println();
        System.out.printf("Generated on %s from `%s`.%n", LocalDate.now(), revision());
        System.out.println();
    }

    // ----------------------------------------------------------------- the API contract

    private static final class ApiContract {

        private static final Pattern MAPPING = Pattern.compile(
                "@(Get|Post|Put|Delete|Patch)Mapping(?:\\(\\s*(?:value\\s*=\\s*)?\"([^\"]*)\"[^)]*\\)|\\([^)]*\\)|)");
        private static final Pattern BASE = Pattern.compile("@RequestMapping\\(\"([^\"]+)\"\\)");
        private static final Pattern PRE_AUTHORIZE = Pattern.compile("@PreAuthorize\\(\"([^\"]+)\"\\)");
        private static final Pattern ROLE = Pattern.compile("hasRole\\('([A-Z_]+)'\\)");
        private static final Pattern ANY_ROLE = Pattern.compile("hasAnyRole\\(([^)]+)\\)");
        private static final Pattern METHOD = Pattern.compile(
                "public\\s+[\\w<>,.\\[\\] ?]+\\s+(\\w+)\\s*\\(");
        private static final Pattern JAVADOC = Pattern.compile(
                "/\\*\\*(.*?)\\*/\\s*(?:@\\w+(?:\\([^)]*\\))?\\s*)*$", Pattern.DOTALL);

        record Route(String verb, String path, String who, String what) {
        }

        void print() throws IOException {
            Map<String, List<Route>> byController = new LinkedHashMap<>();
            int total = 0;

            for (Path file : javaFiles(BACKEND, "Controller.java")) {
                String source = read(file);
                String base = first(BASE, source).orElse("");
                String classRoles = first(PRE_AUTHORIZE, source.split("public class")[0])
                        .map(ApiContract::roles)
                        .orElse("public");

                List<Route> routes = new ArrayList<>();
                Matcher mapping = MAPPING.matcher(source);
                while (mapping.find()) {
                    String suffix = mapping.group(2) == null ? "" : mapping.group(2);
                    String path = (base + suffix).isEmpty() ? "/" : base + suffix;
                    String tail = source.substring(mapping.end(),
                            Math.min(source.length(), mapping.end() + 600));
                    String who = tail.startsWith("\n    @PreAuthorize")
                            ? first(PRE_AUTHORIZE, tail).map(ApiContract::roles).orElse(classRoles)
                            : classRoles;

                    routes.add(new Route(mapping.group(1).toUpperCase(), path, who,
                            describe(source, mapping.start(), methodName(tail))));
                }

                if (!routes.isEmpty()) {
                    byController.put(file.getFileName().toString().replace("Controller.java", ""), routes);
                    total += routes.size();
                }
            }

            header("RideX — API Contract",
                    "Every endpoint the backend serves: **%d** across %d controllers."
                            .formatted(total, byController.size()),
                    "java tools/DocGen.java api > docs/10-API-Contract.md");

            System.out.println("""
                    ## Conventions

                    - **Auth.** A bearer access token (JWT, fifteen minutes) on every route below except the
                      public ones. Refresh tokens are opaque, stored hashed, and rotate on use.
                    - **Roles.** Taken from the token, never from the path or the body. The *Who* column is
                      what the route's `@PreAuthorize` actually enforces.
                    - **Errors.** RFC 7807 `application/problem+json`, with an `errors` map on validation
                      failures - one shape everywhere, so one client-side handler covers the platform.
                    - **Money.** Always minor units next to an ISO currency. The client never sends a price.
                    - **Idempotency.** Payment intents carry an idempotency key: a retry on a bad network
                      must not become a second charge.
                    """);

            byController.forEach((controller, routes) -> {
                System.out.println("## " + controller);
                System.out.println();
                System.out.println("| Method | Path | Who | What |");
                System.out.println("|---|---|---|---|");
                routes.forEach(route -> System.out.printf("| %s | `%s` | %s | %s |%n",
                        route.verb(), route.path(), route.who(), route.what()));
                System.out.println();
            });
        }

        private static Optional<String> first(Pattern pattern, String text) {
            Matcher matcher = pattern.matcher(text);
            return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
        }

        /** The roles an expression allows, as words rather than SpEL. */
        private static String roles(String expression) {
            Matcher one = ROLE.matcher(expression);
            if (one.find()) {
                return one.group(1);
            }
            Matcher many = ANY_ROLE.matcher(expression);
            if (many.find()) {
                return many.group(1).replace("'", "").replaceAll("\\s+", " ").trim();
            }
            return "authenticated";
        }

        private static String methodName(String tail) {
            Matcher matcher = METHOD.matcher(tail);
            return matcher.find() ? matcher.group(1) : "endpoint";
        }

        /**
         * What a route is for, in the words already next to it.
         *
         * <p>The first sentence of its javadoc, or its own name when it has none - the same thing a
         * reader of the code sees. Bounded to what sits immediately above the annotation: reaching
         * further up finds the class javadoc and labels every undocumented route with it.
         */
        private static String describe(String source, int at, String methodName) {
            String head = source.substring(Math.max(0, at - 700), at);
            Matcher javadoc = JAVADOC.matcher(head);
            if (javadoc.find() && head.substring(javadoc.end()).lines().count() <= 6) {
                String text = javadoc.group(1).lines()
                        .map(line -> line.strip().replaceFirst("^\\*", "").strip())
                        .reduce("", (all, line) -> all.isEmpty() ? line : all + " " + line)
                        .replaceAll("<[^>]+>", " ")
                        .strip();
                text = text.split("(?<=[a-z)])\\.\\s")[0].strip().replaceAll("\\.$", "");
                if (!text.isBlank()) {
                    return text;
                }
            }

            String spaced = methodName.replaceAll("(?<!^)(?=[A-Z])", " ").toLowerCase();
            return spaced.substring(0, 1).toUpperCase() + spaced.substring(1);
        }
    }

    // ----------------------------------------------------------------- the ERD

    private static final class Erd {

        private static final Pattern CREATE = Pattern.compile(
                "CREATE TABLE (?:IF NOT EXISTS )?(\\w+)\\s*\\((.*?)\\n\\);", Pattern.DOTALL);
        private static final Pattern ADD_COLUMN = Pattern.compile(
                "ALTER TABLE (\\w+)\\s+ADD COLUMN (\\w+)\\s+([A-Z][\\w()\\s,]*)", Pattern.CASE_INSENSITIVE);
        private static final Pattern REFERENCES = Pattern.compile(
                "REFERENCES\\s+(\\w+)\\s*\\(", Pattern.CASE_INSENSITIVE);
        private static final Pattern SKIP =
                Pattern.compile("(PRIMARY KEY|UNIQUE|CHECK|CONSTRAINT|FOREIGN KEY)\\b",
                        Pattern.CASE_INSENSITIVE);

        /** Which module a table belongs to, so the diagram reads in the order the platform works. */
        private static final Map<String, List<String>> MODULES = new LinkedHashMap<>(Map.of());

        static {
            MODULES.put("Identity and access",
                    List.of("users", "user_roles", "user_tokens", "refresh_tokens", "auth_events"));
            MODULES.put("Riders and drivers",
                    List.of("rider_profiles", "driver_profiles", "driver_documents",
                            "driver_vehicles", "saved_places"));
            MODULES.put("Rides and dispatch",
                    List.of("ride_types", "pricing_rules", "fare_estimates", "fare_estimate_lines",
                            "ride_requests", "ride_offers", "trips", "trip_status_history",
                            "trip_fare_lines", "trip_locations", "ride_ratings",
                            "cancellation_policies"));
            MODULES.put("Shuttle",
                    List.of("routes", "route_stops", "route_fares", "shuttle_schedules",
                            "shuttle_trips", "shuttle_bookings", "pass_products", "passes"));
            MODULES.put("Money",
                    List.of("payments", "payment_events", "refunds", "rider_dues",
                            "driver_earnings", "driver_payouts", "ledger_entries"));
            MODULES.put("Loyalty", List.of("point_entries", "referrals"));
            MODULES.put("Support and comms",
                    List.of("support_tickets", "support_messages", "notification_outbox",
                            "user_notifications", "notification_preferences", "device_tokens"));
            MODULES.put("Platform", List.of("platform_settings", "audit_logs"));
        }

        record Column(String name, String type) {
        }

        void print() throws IOException {
            Map<String, List<Column>> tables = new LinkedHashMap<>();
            Set<String> links = new TreeSet<>();

            List<Path> migrations = javaFiles(MIGRATIONS, ".sql").stream()
                    .sorted(Comparator.comparingInt(Erd::version))
                    .toList();

            for (Path file : migrations) {
                String sql = read(file);

                Matcher create = CREATE.matcher(sql);
                while (create.find()) {
                    String table = create.group(1);
                    List<Column> columns = new ArrayList<>();
                    for (String raw : create.group(2).split("\n")) {
                        String line = raw.strip().replaceAll(",$", "");
                        if (line.isEmpty() || line.startsWith("--")) {
                            continue;
                        }
                        Matcher reference = REFERENCES.matcher(line);
                        while (reference.find()) {
                            links.add(reference.group(1) + ">" + table);
                        }
                        if (SKIP.matcher(line).lookingAt()) {
                            continue;
                        }
                        String[] parts = line.split("\\s+");
                        if (parts.length >= 2) {
                            columns.add(new Column(parts[0], parts[1].replaceAll(",$", "")));
                        }
                    }
                    tables.put(table, columns);
                }

                Matcher added = ADD_COLUMN.matcher(sql);
                while (added.find()) {
                    tables.computeIfAbsent(added.group(1), key -> new ArrayList<>())
                            .add(new Column(added.group(2), added.group(3).split("\\s+")[0].replaceAll(",$", "")));
                }
            }

            header("RideX — ERD",
                    "**%d tables**, one platform database, no organisation column anywhere (ADR-001)."
                            .formatted(tables.size()),
                    "java tools/DocGen.java erd > docs/09-Project-ERD.md");

            System.out.println("""
                    ## How to read it

                    - Every id is a ULID stored as `VARCHAR(26)`: sortable by creation time, and safe to
                      generate before the row is written.
                    - Money is an integer of minor units next to an ISO currency. No floats.
                    - Nothing is deleted. Cancellations, refunds and points all append a row rather than
                      rewriting the one that came before.
                    """);

            Set<String> placed = new LinkedHashSet<>();
            MODULES.values().forEach(placed::addAll);
            List<String> leftovers = tables.keySet().stream().filter(name -> !placed.contains(name)).toList();

            Map<String, List<String>> sections = new LinkedHashMap<>(MODULES);
            if (!leftovers.isEmpty()) {
                sections.put("Other", leftovers);
            }

            sections.forEach((title, names) -> {
                List<String> present = names.stream().filter(tables::containsKey).toList();
                if (present.isEmpty()) {
                    return;
                }
                System.out.println("## " + title);
                System.out.println();
                System.out.println("```mermaid");
                System.out.println("erDiagram");
                links.stream()
                        .map(link -> link.split(">"))
                        .filter(ends -> present.contains(ends[0]) && present.contains(ends[1]))
                        .forEach(ends -> System.out.printf("    %s ||--o{ %s : \"\"%n",
                                ends[0].toUpperCase(), ends[1].toUpperCase()));
                present.forEach(name -> {
                    System.out.printf("    %s {%n", name.toUpperCase());
                    tables.get(name).forEach(column -> System.out.printf("      %s %s%n",
                            column.type().toLowerCase().replace("(", "_").replace(")", "").replace(",", "_"),
                            column.name()));
                    System.out.println("    }");
                });
                System.out.println("```");
                System.out.println();
            });

            System.out.println("## Across modules");
            System.out.println();
            System.out.println("Relationships whose two ends live in different sections above:");
            System.out.println();
            links.stream().map(link -> link.split(">")).forEach(ends -> {
                String from = moduleOf(sections, ends[1]);
                String to = moduleOf(sections, ends[0]);
                if (from != null && to != null && !from.equals(to)) {
                    System.out.printf("- `%s` → `%s` (%s → %s)%n", ends[1], ends[0], from, to);
                }
            });
        }

        private static String moduleOf(Map<String, List<String>> sections, String table) {
            return sections.entrySet().stream()
                    .filter(entry -> entry.getValue().contains(table))
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null);
        }

        /** V13__payments.sql sorts after V9, which a plain filename sort gets wrong. */
        private static int version(Path path) {
            Matcher matcher = Pattern.compile("^V(\\d+)").matcher(path.getFileName().toString());
            return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
        }
    }

    // ----------------------------------------------------------------- the notification matrix

    private static final class NotificationMatrix {

        private static final Pattern CASE = Pattern.compile("case \"(\\w+)\"");

        void print() throws IOException {
            Path templatesFile = BACKEND.resolve("notification/NotificationTemplates.java");
            String templates = read(templatesFile);

            List<String> events = new ArrayList<>();
            Matcher cases = CASE.matcher(templates);
            while (cases.find()) {
                events.add(cases.group(1));
            }

            Map<String, Set<String>> channels = new LinkedHashMap<>();
            Map<String, Set<String>> raisedBy = new LinkedHashMap<>();
            Set<String> inFeed = new LinkedHashSet<>();

            for (Path file : javaFiles(BACKEND, ".java")) {
                if (file.equals(templatesFile)) {
                    continue;
                }
                String source = read(file);
                for (String event : events) {
                    // Found by looking for the event name rather than for a call shape: several are
                    // passed through a variable, and a regex on the call site reports those as
                    // never sent.
                    int at = source.indexOf('"' + event + '"');
                    if (at < 0) {
                        continue;
                    }
                    String where = file.getParent().getFileName() + "/"
                            + file.getFileName().toString().replace(".java", "");
                    raisedBy.computeIfAbsent(event, key -> new TreeSet<>()).add(where);

                    Set<String> found = channels.computeIfAbsent(event, key -> new TreeSet<>());
                    Matcher channel = Pattern.compile("DeliveryChannel\\.(\\w+)").matcher(source);
                    while (channel.find()) {
                        found.add(title(channel.group(1)));
                    }
                    // A file that calls notifyUser sends every one of its events both ways: the
                    // enqueue and the feed row sit together in one helper.
                    if (source.contains("notifyUser")) {
                        found.add("Push");
                        inFeed.add(event);
                    }
                    if (found.isEmpty()) {
                        found.add("Email");
                    }
                }
            }

            header("RideX — Notification Matrix",
                    "Every message the platform actually sends, from the templates and the code that "
                            + "enqueues them.",
                    "java tools/DocGen.java notifications > docs/12-Notification-Matrix.md");

            System.out.println("""
                    ## How a message gets out

                    Domain change → a row in `notification_outbox`, written inside the same transaction →
                    `OutboxDispatcher` drains it every few seconds → channel. Nothing sends inside a
                    business transaction: a completed signup must not roll back because a mail server was
                    briefly unreachable, and a message that was never written is one nobody can chase.

                    `Notifier.notifyUser` does two things at once: the push, and a row in
                    `user_notifications` so the person can find it again after the push is swiped away.

                    Push respects `notification_preferences`; email does not. An address is not always an
                    account - a verification code goes to somebody who has none yet, and must.

                    ## Events

                    | Event | Channels | In the app's feed | Raised by |
                    |---|---|---|---|""");

            for (String event : events) {
                Set<String> where = raisedBy.get(event);
                if (where == null) {
                    System.out.printf("| `%s` | — | — | *template only, nothing sends it* |%n", event);
                    continue;
                }
                String sent = String.join(" + ", channels.get(event));
                System.out.printf("| `%s` | %s | %s | %s |%n",
                        event, sent, inFeed.contains(event) ? "Yes" : "No",
                        where.stream().map(name -> "`" + name + "`").reduce((a, b) -> a + ", " + b).orElse(""));
            }

            System.out.println();
            System.out.println("""
                    ## Not built

                    - **SMS.** `SmsChannel` logs and returns. A real provider needs an account, per-message
                      billing and - in India - DLT template registration, none of which should be decided by
                      whoever wires the interface. Swap the body of `send()`; nothing above it changes.
                    - **Ops alerts.** Nothing notifies operations. They read the console.""");
        }

        private static String title(String word) {
            return word.charAt(0) + word.substring(1).toLowerCase();
        }
    }

    private DocGen() {
    }
}
