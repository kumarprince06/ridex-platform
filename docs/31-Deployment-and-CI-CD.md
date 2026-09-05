# Deployment, CI/CD and Release

How to get RideX running on the internet on a free or near-free tier, keep it deployed
automatically, and get the apps into people's hands. Written against what the repo actually needs:
a Spring Boot service on Java 21, PostgreSQL 17, Redis, SMTP, a Vite admin panel, and two Expo
apps.

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

## Option A — the free stack (recommended to start)

Everything free, no card for the base tier, good enough to demo and to let real people use it.

- **Backend → Render free web service** or **Fly.io**. Render's free tier sleeps after 15 minutes
  of no traffic and takes ~30s to wake; fine for a demo, not for a live pilot. Fly's free
  allowance stays warm and is the better choice if the account has one.
- **Postgres → Neon free tier.** 0.5 GB, allows `btree_gist`, and branches per environment, which
  is genuinely useful for testing migrations.
- **Redis → Upstash free tier.** 10k commands a day.
- **Admin panel → Vercel or Netlify free.** Static build, instant deploys per push.
- **Mail → Brevo free**, already wired.
- **Maps → the current free routing/geocoding providers**, unchanged.

Cost: zero. Ceiling: the sleeping backend and 0.5 GB of database.

## Option B — cheap and always-on (when it needs to be real)

- One **VPS at ₹350–500/month** (Hetzner CX22, DigitalOcean, or an Indian provider for latency):
  2 vCPU, 4 GB. Runs the backend, Postgres, Redis and Caddy in Docker Compose on one box.
- Caddy for automatic HTTPS on a domain (~₹800/year).
- Backups: `pg_dump` on a cron to object storage. Not optional once anybody real is using it.

This is the honest recommendation for a portfolio piece somebody might be shown live: one small
box, always awake, one command to redeploy.

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
   disk in plaintext next to a repo.
4. **Production profile** — `app.mail.echo-to-log` off, Hibernate `ddl-auto` untouched (Flyway
   owns the schema), actuator locked down to health only, CORS set to the admin panel's domain.
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

**For the Play Store**, in order:
1. Google Play developer account — **$25, one time**. The only unavoidable cost in this document.
2. A privacy policy URL and a data-safety declaration. The apps collect location, email, phone and
   payment identifiers — that has to be declared accurately, and location is the one Google reads
   closely. Background location, if the partner app ever asks for it, needs a written
   justification and a demo video.
3. App signing: let Google manage the key; keep the upload key backed up.
4. Store listing: icon, feature graphic, at least two screenshots per app, short and full
   description.
5. **Closed testing with 12 testers for 14 days** before a personal developer account can go to
   production. Plan two weeks for this — it is the step people are surprised by.
6. Two separate listings: RideX (rider) and RideX Partner. Same account, different package ids.

**Before submitting:** the API base URL cannot stay at a LAN IP — the apps read
`EXPO_PUBLIC_API_BASE_URL` at build time, so the release build needs the deployed HTTPS URL, and
the backend needs a real certificate. Android blocks plaintext HTTP by default.

---

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
