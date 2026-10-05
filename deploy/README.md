# Deploying RideX

One host, four containers, free HTTPS. Everything the platform needs runs from this directory:
the backend, Postgres, Redis and Caddy. The console is a static build and goes on a CDN; the two
apps are built with EAS and installed on devices.

## What runs where

| Piece | Where | Cost |
|---|---|---|
| Backend, Postgres, Redis, Caddy | One always-on VM | Free on Oracle Cloud's Always Free ARM tier |
| Admin console | Cloudflare Pages or Netlify | Free |
| Rider and partner apps | EAS build, installed on devices | Free |

## Choosing a host

| | Oracle Cloud Always Free | Railway | Render |
|---|---|---|---|
| Cost | Free | Paid, usage-based | Paid instance plus database |
| Always on | Yes | Yes | Only on a paid instance; the free one sleeps |
| You run | The VM: OS updates, Docker, firewall, backups | Nothing | Nothing |
| Postgres and Redis | Containers on the same VM | Managed add-ons | Managed add-ons |
| HTTPS | Caddy, automatic | Automatic | Automatic |
| IP rate limiting | Works: Caddy discards client-sent `X-Forwarded-For` | Works: Railway strips it at the edge | **Can be bypassed** (see below) |
| Setup time | An hour, mostly the first-time VM and DNS | Minutes | Minutes |

**Recommendation for the public demo: Railway** if paying a few dollars a month is fine, **Oracle**
if it has to be free and you are happy to run a VM. Check current prices on each provider's site.

A scale-to-zero host (Render's free web service, Koyeb) is the wrong shape for this: the JVM needs
a gigabyte and thirty seconds to wake, and a demo that begins with a sixty-second blank screen is
a demo nobody waits through.

**Render and the rate limiter.** The IP limiter reads the first `X-Forwarded-For` entry. Render
appends to whatever the client sent instead of replacing it, so a caller can put any value first
and get a fresh allowance per request. The per-account login failure limit still holds, since it is
keyed by email. Fine for a demo; fix the IP parsing before relying on Render for anything public.

## Render or Railway

Both build `ridex-backend/Dockerfile` straight from the repository. Give the service **1 GB of
memory or more**: the backend sits around 450 MB, and 512 MB leaves no headroom.

| Setting | Render | Railway |
|---|---|---|
| Source | Web service, runtime Docker, root directory `ridex-backend` | Service from the repo, root directory `ridex-backend` |
| Postgres | Render Postgres | Postgres plugin |
| Redis | Render Key Value | Redis plugin |
| Health check path | `/actuator/health` | `/actuator/health` |
| Port | Injected as `PORT`; nothing to set | Injected as `PORT`; nothing to set |

Environment variables:

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `demo` for the reviewer demo; unset for real data |
| `RIDEX_JWT_SECRET` | `openssl rand -base64 48` |
| `SPRING_DATASOURCE_URL` | JDBC form: `jdbc:postgresql://<host>:5432/<database>`. Both platforms show a `postgres://` URL, which the JDBC driver rejects; on Railway use `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
| `SPRING_DATASOURCE_USERNAME` | The database user (Railway: `${{Postgres.PGUSER}}`) |
| `RIDEX_APP_PASSWORD` | The database password (Railway: `${{Postgres.PGPASSWORD}}`) |
| `SPRING_DATA_REDIS_URL` | The Redis URL as given, password included (Render: the internal Key Value URL; Railway: `${{Redis.REDIS_URL}}`) |
| `GOOGLE_MAPS_API_KEY` or `ORS_API_KEY` | One of them. Every fare estimate needs a route, and the keyless provider only geocodes, so without a key no ride can be quoted or booked. OpenRouteService has a free tier |

Optional:

| Variable | When |
|---|---|
| `RIDEX_DEMO_PASSWORD` | To change the published demo password |
| `RIDEX_DEMO_RESET_CRON` | To move the nightly reset from 03:00 IST |
| `RIDEX_MAIL_HOST`, `RIDEX_MAIL_PORT`, `RIDEX_MAIL_USERNAME`, `RIDEX_MAIL_PASSWORD`, `RIDEX_MAIL_FROM` | So public signup can deliver its verification code, for example through Brevo's SMTP relay. Without them signup cannot complete, and queued mail is retried and then dropped |
| `RIDEX_CORS_ALLOWED_ORIGINS` | Only if the admin console is hosted; Swagger UI is same-origin |

Never set `RIDEX_BOOTSTRAP_ADMIN_*` on the demo; the demo profile ignores them anyway, because the
demo password is public.

The disk on both platforms is wiped on every deploy, so uploaded driver documents do not survive
one. Nothing on the demo needs them; a real deployment sets the document bucket variables.

## Oracle Cloud (always free)

### First deployment

**1. The host.** Ubuntu 24.04, 2 vCPU, 4 GB or more. Open 80 and 443 in the provider's firewall
*and* in the host's own - Oracle's images arrive with everything blocked:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker "$USER"          # sign out and back in
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**2. DNS.** Point `api.<domain>` at the host's address *before* the first boot: Caddy asks Let's
Encrypt for a certificate for that exact name, and the request fails if it does not resolve yet.

**3. Secrets.**

```bash
git clone https://github.com/kumarprince06/ridex-platform.git ~/ridex-platform && cd ~/ridex-platform/deploy
cp .env.production.example .env.production
openssl rand -base64 48        # RIDEX_JWT_SECRET
openssl rand -base64 24        # RIDEX_APP_PASSWORD
$EDITOR .env.production
```

Generate fresh values rather than copying the development ones. Those have sat in plaintext next
to a git working tree, and a leaked SMTP key sends spam from your own domain.

**4. Up.**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
curl https://api.<domain>/actuator/health
```

Flyway runs at boot, so the schema arrives with the code. The bootstrap admin is created on first
start from `RIDEX_BOOTSTRAP_ADMIN_*`.

**5. Nothing else is seeded,** unless `SPRING_PROFILES_ACTIVE=demo` is set in `.env.production`:
then the reviewer accounts are seeded and everything resets nightly. Otherwise the admin is the only
account; routes, fares, drivers and legal text are all set up from the console.

### Every deployment after that

Merging to `main` builds the image and pushes it to GHCR. The host step is skipped until the
repository variable `DEPLOY_ENABLED` is `true` and these secrets exist:

| Secret | What |
|---|---|
| `DEPLOY_HOST` | The host's address |
| `DEPLOY_USER` | The user that owns `~/ridex-platform` |
| `DEPLOY_SSH_KEY` | A private key whose public half is in that user's `authorized_keys` |

It pulls the image tagged with the commit, restarts, and waits on `/actuator/health` - a migration
that fails fails the deployment rather than quietly leaving the API down.

Rolling back is the same command with an older tag:

```bash
echo "RIDEX_TAG=<previous-sha>" > .env.tag
docker compose -f docker-compose.prod.yml --env-file .env.production --env-file .env.tag up -d
```
