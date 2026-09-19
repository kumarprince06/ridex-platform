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

A scale-to-zero host (Render's free web service, Koyeb) is the wrong shape for this: the JVM needs
a gigabyte and thirty seconds to wake, and a demo that begins with a sixty-second blank screen is
a demo nobody waits through.

## First deployment

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
git clone <repo-url> ~/ridex-platform && cd ~/ridex-platform/deploy
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

**5. Nothing else is seeded.** The admin is the only account; routes, fares, drivers and legal
text are all set up from the console.

## Every deployment after that

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
