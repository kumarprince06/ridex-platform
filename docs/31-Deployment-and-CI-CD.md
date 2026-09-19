# Deployment, CI/CD and Release

**The goal here is a demo deployment, not a launch.** RideX is going up so it can be shown and
explained — to an interviewer, on LinkedIn, to anyone being told what was built and why. Nobody is
booking a real ride on it and no real money moves through it.

That changes what matters. A demo has to be *reachable, seeded and honest*: a link that works when
somebody clicks it three days later, data that makes the product legible in two minutes, and no
pretending it is production. It does not need high availability, backups, GST invoicing or a
payout gateway — [32-Business-Readiness-and-New-Lines.md](32-Business-Readiness-and-New-Lines.md)
covers what a real launch would need, and being able to hand somebody that list is itself worth
more than a half-built version of it.

Written against what the repo actually needs: a Spring Boot service on Java 21, PostgreSQL 17,
Redis, SMTP, a Vite admin panel, and two Expo apps.

---

## What has to run

| Piece | Needs | Notes |
|---|---|---|
| `ridex-backend` | Java 21, ~512 MB RAM, one port | Boots in ~10s. Flyway migrates on start. |
| PostgreSQL 17 | ~1 GB storage to start | Uses `btree_gist`, so a managed Postgres must allow that extension. |
| Redis | tiny | Driver presence. The app boots without it only if that is made optional. |
| SMTP | any provider | Brevo already configured; free tier is 300 mails/day. |
| `ridex-admin-web` | static files | Vite build, no server needed. |
| Rider / partner apps | build only | Distributed as APKs or through the stores. |

Two things to fix before any of this is deployed:

1. **`btree_gist`** — the shuttle seat constraint needs it. Neon, Supabase and Railway allow it;
   some managed Postgres tiers do not. Check before choosing.
2. **Redis** — confirm whether the app starts without it, or plan for a free Redis (Upstash has
   one). Right now a missing Redis is an unknown.

---

## Option A — the free stack (this is the one)

Everything free, no card for the base tier. For a demo this is not a compromise, it is the correct
choice.

- **Backend → Render free web service** or **Fly.io**. Render's free tier sleeps after 15 minutes
  of no traffic and takes ~30s to wake. That matters more than it sounds for a demo: the person
  you sent the link to opens it, waits thirty seconds on a blank screen, and decides it is broken.
  Two ways round it — Fly's free allowance stays warm, or ping the Render service every 10 minutes
  from a GitHub Actions cron. Do one of them.
- **Postgres → Neon free tier.** 0.5 GB, allows `btree_gist`, and branches per environment, which
  is genuinely useful for testing migrations.
- **Redis → Upstash free tier.** 10k commands a day.
- **Admin panel → Vercel or Netlify free.** Static build, instant deploys per push.
- **Mail → Brevo free**, already wired.
- **Maps → the current free routing/geocoding providers**, unchanged.

Cost: zero. Ceiling: the sleeping backend and 0.5 GB of database.

## Option B — cheap and always-on (only if the demo needs to be reliably instant)

- One **VPS at ₹350–500/month** (Hetzner CX22, DigitalOcean, or an Indian provider for latency):
  2 vCPU, 4 GB. Runs the backend, Postgres, Redis and Caddy in Docker Compose on one box.
- Caddy for automatic HTTPS on a domain (~₹800/year).
- Backups: `pg_dump` on a cron to object storage. Not optional once anybody real is using it.

Worth it only if the sleeping-backend problem becomes annoying, or if several people are being
walked through it in the same week. Otherwise Option A and a keep-warm ping is enough.

---

## The runbook

Written and working: [`deploy/README.md`](../deploy/README.md) is the step-by-step, and
`deploy/docker-compose.prod.yml` is what runs. The rest of this document is why it is shaped that
way.

## What had to be built first

All of this now exists:

1. **`ridex-backend/Dockerfile`** — multi-stage: Maven build, then a JRE 21 runtime image, running
   as a non-root user. 442 MB, most of it the JRE and the Spring dependency set; a jlink runtime
   would roughly halve it and is the next thing to try if the pull ever becomes the slow part.
2. **`docker-compose.prod.yml`** — backend, Postgres, Redis, Caddy. The existing
   `docker-compose.yml` is a local dev file (it has Mailpit in it) and should not be reused as-is.
3. **Secrets out of `.env`.** `.env` currently holds a real Brevo SMTP key, real Razorpay test
   keys and the JWT secret. It is gitignored, but the moment this is deployed those must come from
   the host's secret store, and the ones in the file should be rotated because they have been on
   disk in plaintext next to a repo. This one still applies to a demo — a real SMTP key can be
   abused to send spam from your domain whatever the deployment is for.
4. **A demo profile** — CORS set to the admin panel's domain, actuator locked to health, Flyway
   left in charge of the schema. Keep Razorpay on **test keys**: the checkout still opens, the test
   card still works, and nobody can accidentally be charged. Mail can either go to Brevo, or point
   at a Mailpit instance so invoices are visible without emailing strangers.
5. **A real health check** — `/actuator/health` already exists; the platform's health check should
   point at it.

---

## CI/CD

CI today (`.github/workflows/ci.yml`) boots Postgres and runs `mvnw verify`, which is a good base:
a migration that does not apply fails the build. What to add:

**On every PR**
- The existing backend job.
- `npm ci && npx tsc --noEmit` for the rider app, partner app and admin web. Type errors are the
  cheapest bug to catch and none of the three is checked today.

**On merge to `main`**
- Build and push the backend image to GHCR (free for public repos).
- Deploy: for Render/Fly, a deploy hook; for a VPS, an SSH step that pulls the image and restarts
  the compose service.
- Build the admin panel and deploy to Vercel/Netlify.
- Run Flyway as part of the app boot (already the case) so migrations ship with the code.

**On a tag (`v*`)**
- Build the two Expo apps with EAS and upload the artefacts to the release.

Keep the whole thing on GitHub's free 2,000 minutes/month — the backend build is the only slow
job, and Maven caching is already configured.

---

## The mobile apps

Both apps are Expo with prebuilt `android/` directories, so both routes are open.

**For sharing now:** `eas build --platform android --profile preview` gives an APK anyone can
install. EAS has a free tier with a build queue; a local `./gradlew assembleRelease` is unlimited
and free if the machine is available.

**For a demo, an APK link is usually enough.** Send the build, or put it behind a QR on the
project page. If it needs to be installable from the store, the shortest route is Play's
**internal testing** track — up to 100 testers by email, no review wait, and none of the closed
testing requirements below.

**For a full public Play Store listing**, in order:
1. Google Play developer account — **$25, one time**. The only unavoidable cost in this document.
2. A privacy policy URL and a data-safety declaration. The apps collect location, email, phone and
   payment identifiers — that has to be declared accurately, and location is the one Google reads
   closely. Background location, if the partner app ever asks for it, needs a written
   justification and a demo video.
3. App signing: let Google manage the key; keep the upload key backed up.
4. Store listing: icon, feature graphic, at least two screenshots per app, short and full
   description.
5. **Closed testing with 12 testers for 14 days** before a personal developer account can go to
   production. Plan two weeks for this — it is the step people are surprised by, and it is the
   reason internal testing is the better answer for a demo.
6. Two separate listings: RideX (rider) and RideX Partner. Same account, different package ids.

**Before submitting:** the API base URL cannot stay at a LAN IP — the apps read
`EXPO_PUBLIC_API_BASE_URL` at build time, so the release build needs the deployed HTTPS URL, and
the backend needs a real certificate. Android blocks plaintext HTTP by default.

---

## Seed data

Nothing but the admin. On first boot the backend creates one super admin from
`RIDEX_BOOTSTRAP_ADMIN_EMAIL` / `RIDEX_BOOTSTRAP_ADMIN_PASSWORD`; everything else - shuttle routes,
fares, timetables, legal text - is created from the admin console, and riders and drivers sign up
through the apps. Migrations add only configuration the code needs (ride types, fare settings,
empty legal pages).

- **Test payments only.** Razorpay test key, card `4111 1111 1111 1111`.
- **Tests never touch this database.** The backend test suite runs against its own
  `ridex_platform_test` database (`src/test/resources/application.properties`).

## A walkthrough worth watching

The strongest two minutes this project has, in order:

1. Book a shuttle seat: pick stops from a real Kolkata route, choose a seat on a 2+2 bus, pay with
   points *and* Razorpay test, get a ticket with a QR and an OTP.
2. Open the invoice PDF from the email — branded, with payment status, method and gateway
   reference on it.
3. Cancel a seat 30 minutes out and watch 80% come back as points, then spend those points on the
   next booking.
4. Open the admin panel next to it: the same payment, the same rider, the audit trail.

That sequence shows inventory, payments, loyalty, refunds-as-credit, documents and operations —
which is the argument that this is a platform, not a screen collection.

## What to fix before showing it to anyone

The four things that used to be here - the rider app running on timers, the hardcoded 8.2 km fare,
the missing shuttle screens, the mock admin detail pages - are done. Fifteen of the sixteen modules
on [34-Module-Task-Board.md](34-Module-Task-Board.md) are closed and this deployment is the last one.

What a visitor can still find:

1. A taxi ride is cash only. `/rides/{id}/payment` and its confirm endpoint exist and the rider app
   does not call them yet; shuttle seats and passes do charge through Razorpay.
2. SMS is a stub. Verification codes and receipts go by email; `SmsChannel` logs and returns.
3. Feature flags, notification templates, promotions and staff management are the four admin pages
   still reading mock data, and each is listed as deliberately deferred on the board.

## For showing the work publicly

- The repo already has 30 documents of design, ADRs and state machines. That is the unusual part
  and worth leading with — most portfolio projects have code and no reasoning.
- A short demo video of one real flow end to end (book a seat, pay with Razorpay test, get the
  invoice PDF, board with the QR) says more than screenshots.
- A live URL beats both. That is Option A, one afternoon.
- Say plainly which parts are wired and which are mock. Anyone senior will check, and being the
  one who already knew reads far better than being caught.
