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

## What has to be built first

The repo has **no Dockerfile and no deploy workflow** — CI builds and tests only. Before any
deployment:

1. **`ridex-backend/Dockerfile`** — multi-stage: Maven build, then a JRE 21 runtime image. Keep it
   under 300 MB.
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

## Demo data and accounts

A demo lives or dies on what is in the database when somebody opens it. Prepare, and script:

- **Seeded, re-runnable data.** `ridex-backend/src/main/resources/seed/kolkata-shuttle.sql` already
  does this for the shuttle: real Kolkata corridors, 16 stops, drivers, a 40-seat bus and a 22-seat
  Traveller, a timetable. Do the same for riders, drivers and a few completed trips so Trips,
  Earnings and Analytics are not empty.
- **Fixed demo logins** for rider, driver and admin, written on the project page.
- **A reset script** that puts the database back to the seeded state, so a walkthrough is
  repeatable after somebody has cancelled half of it.
- **Test payments only.** Razorpay test key, card `4111 1111 1111 1111`. Say so on screen or in the
  notes, so nobody thinks they are being asked for money.
- **Clean out the test pollution** first: integration tests have been run against the dev database
  and left ~35 duplicate "Whitefield to Electronic City" routes. They are deactivated, not deleted.

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

Not deployment work, but it is what a visitor will hit:

1. The rider app's live ride still advances on timers, and the driver shown is a mock
   (`28-Rider-App-Gaps.md`, 1 and 2).
2. The partner app reports a **hardcoded 8.2 km** on every completed trip, so every fare is wrong
   (`29-Partner-App-Gaps.md`, 1).
3. The partner app has no shuttle screens at all, so booked seats cannot be boarded
   (`29-Partner-App-Gaps.md`, 3).
4. Admin detail pages are mock behind real lists (`30-Admin-Panel-Gaps.md`, 1).

Those four are what turns "it looks finished" into "it is finished" — and they are the ones a
technical viewer finds in ten minutes.

---

## For showing the work publicly

- The repo already has 30 documents of design, ADRs and state machines. That is the unusual part
  and worth leading with — most portfolio projects have code and no reasoning.
- A short demo video of one real flow end to end (book a seat, pay with Razorpay test, get the
  invoice PDF, board with the QR) says more than screenshots.
- A live URL beats both. That is Option A, one afternoon.
- Say plainly which parts are wired and which are mock. Anyone senior will check, and being the
  one who already knew reads far better than being caught.
