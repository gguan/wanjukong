# Wanjukong

Collectible figure e-commerce platform.

## Tech Stack

- **Frontend:** Nuxt 3 + TypeScript
- **Admin:** Nuxt 3 + TypeScript
- **Backend:** NestJS + Prisma + PostgreSQL
- **Payments:** PayPal REST API v2
- **Storage:** Tencent Cloud COS
- **Deployment:** Docker Compose + Nginx

## Project Structure

```
apps/
  web/       Nuxt 3 storefront      (port 3000)
  admin/     Nuxt 3 admin panel     (port 3002)
  api/       NestJS backend         (port 3001)
deploy/
  nginx.conf
  setup.sh
  deploy.sh
```

## Quick Start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # edit with your values
pnpm db:up                               # start PostgreSQL via Docker
pnpm db:setup                            # generate + migrate + seed
pnpm dev                                 # start all apps
```

Open:
- http://localhost:3000 — storefront
- http://localhost:3002 — admin
- http://localhost:3001/api/health — API

## Database

```bash
pnpm db:up        # start PostgreSQL (Docker)
pnpm db:down      # stop PostgreSQL
pnpm db:setup     # generate + migrate + seed
pnpm db:reset     # drop & recreate with seed
pnpm db:generate  # regenerate Prisma client
pnpm db:migrate   # run pending migrations
```

## Environment Variables

See `apps/api/.env.example` for all backend variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session cookie signing secret |
| `CORS_ORIGIN` | Allowed CORS origins |
| `TENCENT_COS_*` | Tencent Cloud COS credentials |
| `PAYPAL_CLIENT_ID` | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret |
| `SMTP_HOST/PORT/USER/PASS` | Email sending (optional, logs to console if not set) |

## Production Deployment

### Architecture

```
Nginx (SSL)
  |-- overrealm.shop       --> web  :3000
  |-- overrealm.shop/api   --> api  :3001
  |-- admin.overrealm.shop --> admin:3002

Docker Compose
  |-- postgres  |-- api  |-- web  |-- admin
```

### First-Time Setup

```bash
ssh root@<SERVER_IP>

# Install Docker & Nginx
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx git

# SSH key for GitHub private repo
ssh-keygen -t ed25519 -C "server" -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
# Add to GitHub -> Settings -> SSH and GPG keys

# Clone & configure
git clone git@github.com:gguan/wanjukong.git /opt/wanjukong
cd /opt/wanjukong
cp .env.example .env   # edit with real values
nano .env

# SSL (DNS A records must point to this server first)
rm -f /etc/nginx/sites-enabled/default && systemctl restart nginx
certbot certonly --nginx -d overrealm.shop -d admin.overrealm.shop

# Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/overrealm.shop
ln -sf /etc/nginx/sites-available/overrealm.shop /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Build & start
docker compose up -d --build
docker compose exec -T api npx prisma db push
```

### Routine Deployment

```bash
cd /opt/wanjukong && bash deploy/deploy.sh
```

### Notes

- Cloud security group must allow inbound TCP **80** and **443**
- Certbot auto-renews SSL; manual: `certbot renew && systemctl reload nginx`
- Server minimum: 2 cores / 4 GB RAM
