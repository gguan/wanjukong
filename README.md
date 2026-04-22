# Wanjukong

Premium collectible figure e-commerce platform — international web storefront + WeChat mini program + admin panel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Storefront | Nuxt 3 + TypeScript |
| Admin Panel | Nuxt 3 + Element Plus + TypeScript |
| Mini Program | WeChat native (TypeScript) |
| Backend API | NestJS + Prisma + PostgreSQL |
| Payments | PayPal (international) + WeChat Pay V3 (domestic) |
| Storage | Tencent Cloud COS |
| Deployment | Docker Compose + Nginx + GitHub Actions |

## Project Structure

```
apps/
  web/           Nuxt 3 storefront         (port 3000)  overrealm.shop
  admin/         Nuxt 3 admin panel        (port 3002)  admin.wanjukong.com
  api/           NestJS backend            (port 3001)  api.wanjukong.com
  miniprogram/   WeChat mini program       (DevTools)
deploy/
  nginx.conf     Nginx reverse proxy config
  setup.sh       Server first-time setup script
  deploy.sh      Production deploy/update script
```

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm 9.x
- Docker (for PostgreSQL)

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values

# 3. Start database
pnpm db:up

# 4. Setup database (generate client + run migrations + seed)
pnpm db:setup

# 5. Start all apps
pnpm dev
```

Open:
- http://localhost:3000 — storefront
- http://localhost:3002 — admin (login: `admin@wanjukong.com` / `admin123456`)
- http://localhost:3001/api/health — API health check

### Database Commands

```bash
pnpm db:up        # Start PostgreSQL (Docker)
pnpm db:down      # Stop PostgreSQL
pnpm db:setup     # Generate + migrate + seed
pnpm db:reset     # Drop & recreate with seed
pnpm db:generate  # Regenerate Prisma client only
pnpm db:migrate   # Run pending migrations only
```

### Mini Program Development

Open `apps/miniprogram` in WeChat DevTools. The mini program auto-connects to `localhost:3001` in develop mode.

## Environment Variables

See `apps/api/.env.example` (local dev) and `deploy/.env.production.example` (production) for all variables:

**API (`apps/api/.env`)**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session cookie signing secret (`openssl rand -hex 32`) |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) |
| `APP_BASE_URL` | Storefront URL (for email / PayPal return links) |
| `TRUST_PROXY` | Number of reverse-proxy hops (prod = 1 for Nginx) |
| `COOKIE_SECURE` | Leave blank to auto-detect from `NODE_ENV` |
| `TENCENT_COS_*` | Tencent Cloud COS credentials + bucket + region + public base URL |
| `UPLOAD_TEMP_EXPIRE_HOURS` | TTL for temp uploads before cleanup job deletes them |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_BASE_URL` | PayPal API credentials (sandbox vs live) |
| `WECHAT_PAY_APP_ID` | WeChat mini program AppID |
| `WECHAT_APP_SECRET` | WeChat mini program AppSecret |
| `WECHAT_PAY_MCH_ID` | WeChat Pay merchant ID |
| `WECHAT_PAY_API_V3_KEY` | WeChat Pay V3 API key |
| `WECHAT_PAY_PRIVATE_KEY` | WeChat Pay merchant private key (PEM) |
| `WECHAT_PAY_CERT_SERIAL` | WeChat Pay merchant certificate serial number |
| `WECHAT_PAY_PUBLIC_KEY` | WeChat Pay platform public key — **required in prod**; boot fails if missing |
| `WECHAT_PAY_NOTIFY_URL` | WeChat Pay callback URL |
| `RESEND_API_KEY` | Resend transactional email API key (preferred sender) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | SMTP fallback; logs to console if neither Resend nor SMTP set |
| `CONTACT_INBOX_EMAIL` | Destination for `/api/public/contact` submissions (falls back to `SMTP_FROM`) |
| `DEEPL_API_KEY` | DeepL API key; empty = MyMemory free fallback |

**Web (`apps/web/.env`)**

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_SITE_URL` | Canonical public storefront URL (required in prod, boot fails on localhost) |
| `NUXT_PUBLIC_API_BASE` | Browser-facing API base (empty = same-origin via Nginx) |
| `NUXT_API_BASE_INTERNAL` | SSR-only API URL on Docker internal network (e.g. `http://api:3001`) |
| `NUXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client ID exposed to browser JS SDK |

**Admin (`apps/admin/.env`)**

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_API_BASE_URL` | Admin API base URL (same-origin in prod) |

---

## Production Deployment

### Architecture

```
                    Internet
                       |
                    Nginx (SSL)
                   /    |    \
overrealm.shop    /     |     \    admin.wanjukong.com
    |            /      |      \         |
    v           v       v       v        v
  web:3000   /api/*  api.wanjukong.com  admin:3002
              api:3001
                |
            PostgreSQL
```

| Domain | Service | Purpose |
|--------|---------|---------|
| `overrealm.shop` | web + API proxy | International storefront |
| `api.wanjukong.com` | API | Mini program + public API |
| `admin.wanjukong.com` | admin | Admin panel |
| `wanjukong.com` | redirect | 301 → overrealm.shop |

---

### First-Time Server Setup

> Requirements: Ubuntu 22.04+, 2 cores / 4 GB RAM minimum, ports 80 + 443 open.

#### Step 1: Install Docker & Nginx

```bash
ssh root@<SERVER_IP>

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Nginx + Certbot
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx git
```

#### Step 2: Setup SSH key for GitHub

```bash
ssh-keygen -t ed25519 -C "server" -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
# Add this public key to GitHub → Settings → SSH and GPG keys
```

#### Step 3: Clone project & configure

```bash
git clone git@github.com:gguan/wanjukong.git /opt/wanjukong
cd /opt/wanjukong

# Create .env from template
cp deploy/.env.production.example .env
nano .env   # Fill in ALL values (database password, API keys, etc.)
```

#### Step 4: Login to GitHub Container Registry

```bash
# Create a GitHub Personal Access Token with "read:packages" scope
# https://github.com/settings/tokens
docker login ghcr.io -u <your-github-username>
```

#### Step 5: DNS records

Point these domains to your server IP:

```
overrealm.shop        → <SERVER_IP>    (A record)
www.overrealm.shop    → <SERVER_IP>    (A record)
wanjukong.com         → <SERVER_IP>    (A record)
www.wanjukong.com     → <SERVER_IP>    (A record)
api.wanjukong.com     → <SERVER_IP>    (A record)
admin.wanjukong.com   → <SERVER_IP>    (A record)
```

#### Step 6: SSL certificates

```bash
# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Request certificates (DNS must be pointing to this server)
certbot certonly --nginx -d overrealm.shop -d www.overrealm.shop
certbot certonly --nginx -d wanjukong.com -d www.wanjukong.com -d api.wanjukong.com -d admin.wanjukong.com
```

#### Step 7: Configure Nginx

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/wanjukong
ln -sf /etc/nginx/sites-available/wanjukong /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

#### Step 8: Start services

```bash
cd /opt/wanjukong

# Pull pre-built images
docker compose pull

# Start all services
docker compose up -d

# Wait for postgres to be ready, then run migrations
docker compose exec -T api npx prisma migrate deploy

# Seed initial admin user
docker compose exec -T api npx tsx prisma/seed.ts
```

#### Step 9: Verify

```bash
# Check service status
docker compose ps

# Check API health
curl https://api.wanjukong.com/api/health

# Check websites
curl -I https://overrealm.shop
curl -I https://admin.wanjukong.com
```

Done! Login to admin at `https://admin.wanjukong.com` with `admin@wanjukong.com` / `admin123456`. Change the password immediately.

---

### Routine Updates

#### Option A: Automatic (recommended)

Push to `main` branch → GitHub Actions automatically builds Docker images → deploys to server via SSH.

Setup GitHub Secrets (one-time):
- `DEPLOY_HOST` — server IP
- `DEPLOY_USER` — SSH user (e.g. `root`)
- `DEPLOY_KEY` — SSH private key (contents of `~/.ssh/id_ed25519`)

#### Option B: Manual from local machine

```bash
# One-time: create local deploy config
cp .env.deploy.example .env.deploy
# Edit: DEPLOY_HOST=your-server-ip  DEPLOY_USER=root

# Deploy all services
make deploy

# Deploy only one service (faster)
make deploy-api
make deploy-web
make deploy-admin
```

#### Option C: Manual on server

```bash
ssh root@<SERVER_IP>
cd /opt/wanjukong
bash deploy/deploy.sh          # deploy all
bash deploy/deploy.sh api      # deploy only API
```

#### What `deploy.sh` does:

1. `git pull origin main` — pull latest code (for migrations, nginx config)
2. `docker compose pull` — pull pre-built images from registry
3. `docker compose up -d` — restart containers with new images
4. `prisma migrate deploy` — run any new database migrations
5. `docker image prune -f` — clean up old images

---

### Rollback

```bash
# From local machine (TAG = git short hash of the version to rollback to)
make rollback TAG=abc1234

# Or on server manually
docker compose pull   # pull the specific version
docker tag ghcr.io/gguan/wanjukong-api:abc1234 ghcr.io/gguan/wanjukong-api:latest
docker tag ghcr.io/gguan/wanjukong-web:abc1234 ghcr.io/gguan/wanjukong-web:latest
docker tag ghcr.io/gguan/wanjukong-admin:abc1234 ghcr.io/gguan/wanjukong-admin:latest
docker compose up -d
```

---

### Monitoring & Maintenance

```bash
# View service status
make status

# Tail logs (all services)
make logs

# Tail logs (specific service)
make logs-api
make logs-web
make logs-admin

# SSL auto-renews via certbot timer; manual if needed:
certbot renew && systemctl reload nginx

# Database backup
docker compose exec -T postgres pg_dump -U wanjukong wanjukong > backup-$(date +%Y%m%d).sql

# Restore from backup
cat backup-20260331.sql | docker compose exec -T postgres psql -U wanjukong wanjukong
```

---

### WeChat Mini Program Deployment

The mini program is not deployed via Docker — it's uploaded directly from WeChat DevTools.

```bash
# In WeChat DevTools:
# 1. Open apps/miniprogram as project
# 2. Fill in AppID in project.config.json
# 3. Click "Upload" → set version number → submit
# 4. Go to mp.weixin.qq.com → Version Management → Submit for Review
```

Server domain whitelist (WeChat admin console → Development → Server Domain):
- Request domain: `https://api.wanjukong.com`

---

### Notes

- Cloud security group must allow inbound TCP **80** and **443**
- Server minimum: 2 cores / 4 GB RAM
- Docker images are tagged with git short hash for traceability
- Each push to `main` creates a new image version (rollback-friendly)
- Database migrations are always forward-only (`prisma migrate deploy`)
