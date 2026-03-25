# wanjukong

Monorepo for wanjukong — Nuxt 3 frontend, NestJS backend, Nuxt 3 admin dashboard.

## Tech Stack

- **Frontend:** Nuxt 3 + TypeScript
- **Admin:** Nuxt 3 + TypeScript + Pinia
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL 16 + Prisma
- **Package Manager:** pnpm (workspaces)
- **Node.js:** 20+

## Project Structure

```
wanjukong/
├── apps/
│   ├── web/          # Nuxt 3 frontend (port 3000)
│   ├── admin/        # Nuxt 3 admin dashboard (port 3002)
│   └── api/          # NestJS backend (port 3001)
│       └── prisma/   # Prisma schema, migrations, seed
├── infra/
│   └── docker-compose.yml  # PostgreSQL
├── packages/
│   └── shared/       # Shared constants and types
├── package.json
├── pnpm-workspace.yaml
└── .nvmrc
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env

# 3. Start PostgreSQL (choose one method below)

# 4. Setup database (generate client + run migrations + seed data)
pnpm db:setup

# 5. Start all apps
pnpm dev
```

After step 5, open:
- Frontend: http://localhost:3000
- Admin: http://localhost:3002
- API: http://localhost:3001/api/health

## Database Setup

The backend requires PostgreSQL. You have two options:

### Option A: Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
# Start PostgreSQL container
pnpm db:up

# Verify it's running
docker ps | grep wanjukong-postgres
```

This starts PostgreSQL with these defaults (defined in `infra/docker-compose.yml`):

| Setting  | Value      |
| -------- | ---------- |
| Host     | localhost  |
| Port     | 5432       |
| Database | wanjukong  |
| User     | postgres   |
| Password | postgres   |

The default `DATABASE_URL` in `.env.example` matches these settings — no changes needed.

To stop PostgreSQL:

```bash
pnpm db:down
```

### Option B: Homebrew (macOS)

If you don't have Docker, install PostgreSQL directly:

```bash
brew install postgresql@16
brew services start postgresql@16
```

Then create the database:

```bash
createdb wanjukong
```

**Important:** Homebrew PostgreSQL uses your macOS username with no password. Update `apps/api/.env`:

```env
DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/wanjukong
```

Replace `YOUR_USERNAME` with your macOS username (run `whoami` to check).

To stop PostgreSQL:

```bash
brew services stop postgresql@16
```

### Initialize the Database

After PostgreSQL is running, set up the schema and seed data:

```bash
# One command to do it all (generate + migrate + seed)
pnpm db:setup
```

Or run each step individually:

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations (creates tables)
pnpm db:migrate

# Seed sample data (brands, categories, products)
pnpm db:seed
```

### Reset Database

To drop all data and re-run migrations + seed from scratch:

```bash
pnpm db:reset
```

### All Database Scripts

| Script           | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm db:up`     | Start PostgreSQL via Docker                  |
| `pnpm db:down`   | Stop PostgreSQL Docker container             |
| `pnpm db:setup`  | Generate client + migrate + seed (all-in-one)|
| `pnpm db:generate` | Generate Prisma client from schema         |
| `pnpm db:migrate`  | Run pending migrations                     |
| `pnpm db:seed`     | Insert sample data                         |
| `pnpm db:reset`    | Drop & recreate database with seed         |

## Running

```bash
# All apps in parallel
pnpm dev

# Individual apps
pnpm dev:web      # Frontend  → http://localhost:3000
pnpm dev:api      # Backend   → http://localhost:3001
pnpm dev:admin    # Admin     → http://localhost:3002
```

## Default Ports

| App      | Port | URL                    |
| -------- | ---- | ---------------------- |
| Frontend | 3000 | http://localhost:3000   |
| Backend  | 3001 | http://localhost:3001   |
| Admin    | 3002 | http://localhost:3002   |

## API Endpoints

### Public

| Method | Path                       | Description            |
| ------ | -------------------------- | ---------------------- |
| GET    | `/api/health`              | Health check + DB status |
| GET    | `/api/public/brands`       | List all brands        |
| GET    | `/api/public/brands/:slug` | Brand detail + products |
| GET    | `/api/public/categories`   | List all categories    |
| GET    | `/api/public/products`     | List active products (supports `?brand=`, `?category=`, `?scale=`, `?availability=` filters) |
| GET    | `/api/public/products/:slug` | Get product by slug  |
| POST   | `/api/public/orders/buy-now` | Create a single-product order |
| GET    | `/api/public/orders/:orderNo` | Get order by order number |

### Admin

| Method | Path                         | Description         |
| ------ | ---------------------------- | ------------------- |
| GET    | `/api/admin/brands`          | List brands         |
| POST   | `/api/admin/brands`          | Create brand        |
| PUT    | `/api/admin/brands/:id`      | Update brand        |
| DELETE | `/api/admin/brands/:id`      | Delete brand        |
| GET    | `/api/admin/categories`      | List categories     |
| POST   | `/api/admin/categories`      | Create category     |
| PUT    | `/api/admin/categories/:id`  | Update category     |
| DELETE | `/api/admin/categories/:id`  | Delete category     |
| GET    | `/api/admin/products`        | List all products   |
| POST   | `/api/admin/products`        | Create product      |
| PUT    | `/api/admin/products/:id`    | Update product      |
| DELETE | `/api/admin/products/:id`    | Delete product      |
| GET    | `/api/admin/products/:id/images` | List product images |
| POST   | `/api/admin/products/:id/images` | Attach images to product |
| PATCH  | `/api/admin/products/:id/images/reorder` | Reorder images |
| PATCH  | `/api/admin/products/:id/images/:imageId/primary` | Set primary image |
| DELETE | `/api/admin/products/:id/images/:imageId` | Remove image from product |
| GET    | `/api/admin/products/:id/variants` | List product variants |
| POST   | `/api/admin/products/:id/variants` | Create variant |
| GET    | `/api/admin/products/:id/variants/:variantId` | Get variant |
| PATCH  | `/api/admin/products/:id/variants/:variantId` | Update variant |
| DELETE | `/api/admin/products/:id/variants/:variantId` | Delete variant |
| GET    | `/api/admin/orders`          | List all orders     |
| GET    | `/api/admin/orders/:id`      | Get order detail    |
| GET    | `/api/admin/uploads/cos-sts` | Get temporary COS upload credentials |
| POST   | `/api/admin/uploads/register-temp` | Register temp upload in DB |

## Environment Variables

### Backend (`apps/api/.env`)

| Variable       | Default                                                  | Description             |
| -------------- | -------------------------------------------------------- | ----------------------- |
| `PORT`         | `3001`                                                   | API server port         |
| `CORS_ORIGIN`  | `http://localhost:3000`                                  | Allowed CORS origin     |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/wanjukong` | PostgreSQL connection   |
| `TENCENT_COS_SECRET_ID` | —                                              | Tencent Cloud API SecretId |
| `TENCENT_COS_SECRET_KEY` | —                                             | Tencent Cloud API SecretKey |
| `TENCENT_COS_BUCKET` | —                                                   | COS bucket name (e.g. `my-bucket-1250000000`) |
| `TENCENT_COS_REGION` | `ap-guangzhou`                                         | COS bucket region       |
| `TENCENT_COS_PUBLIC_BASE_URL` | —                                          | Public URL prefix for uploaded images |
| `UPLOAD_TEMP_EXPIRE_HOURS` | `24`                                            | Hours before unused temp uploads expire |

### Frontend (`apps/web/.env`)

| Variable               | Default                 | Description     |
| ---------------------- | ----------------------- | --------------- |
| `NUXT_PUBLIC_API_BASE` | `http://localhost:3001`  | Backend API URL |

### Admin (`apps/admin/.env`)

| Variable                   | Default                 | Description     |
| -------------------------- | ----------------------- | --------------- |
| `NUXT_PUBLIC_API_BASE_URL` | `http://localhost:3001`  | Backend API URL |

## Admin Dashboard

The admin dashboard is at http://localhost:3002. It currently uses a **fake login** — any email/password will work. Real authentication will be added in a future step.

## Storefront (apps/web)

The public storefront at http://localhost:3000 provides:

| Route | Description |
| ----- | ----------- |
| `/` | Homepage — featured brands and products |
| `/products` | Product listing with brand/category/scale/availability filters |
| `/products/:slug` | Product detail page |
| `/brands` | Brand listing |
| `/brands/:slug` | Brand detail with products |

All pages fetch data from the public API. The API base URL is configured via `NUXT_PUBLIC_API_BASE` in `apps/web/.env`.

## Buy Now Flow

The storefront supports a single-product "Buy Now" checkout flow:

1. Browse to a product detail page → `/products/:slug`
2. Click **Buy Now**
3. Fill in contact + shipping info on the checkout page → `/checkout/:slug`
4. Submit the order
5. View order confirmation → `/orders/:orderNo`

| Route | Description |
| ----- | ----------- |
| `/checkout/:slug` | Checkout page for a single product |
| `/orders/:orderNo` | Order confirmation / detail page |

Order numbers follow the format `WJK-YYYYMMDD-XXXXX`. Prices are calculated server-side from the selected variant; the frontend never sends price data.

## Product Status & Availability

Product visibility and selling state are separate concepts:

**Status** (visibility):

| Status | Storefront | Purchasable |
| ------ | ---------- | ----------- |
| `DRAFT` | Hidden | No |
| `ACTIVE` | Visible | Depends on availability |
| `INACTIVE` | Hidden | No |

**Availability** (selling state, only matters when status = ACTIVE):

| Availability | Visible | Purchasable |
| ------------ | ------- | ----------- |
| `IN_STOCK` | Yes | Yes |
| `PREORDER` | Yes | Yes (preorder) |
| `SOLD_OUT` | Yes | No (shows "Sold Out") |
| `COMING_SOON` | Yes | No (shows "Coming Soon") |

The Buy Now API enforces these rules server-side. Only `IN_STOCK` and `PREORDER` variants can be ordered.

## Product Variants

Products support multiple sellable variants (e.g., Standard Edition, Deluxe Edition).

- **Product** = shared info (name, brand, category, description, images, sale type)
- **ProductVariant** = sellable unit (price, stock, SKU, availability, status, specifications)
- Each variant has `priceCents` (integer), `stock`, `sku` (unique), `status`, `availabilityType`, `specifications` (text)
- One variant per product is marked `isDefault` — the default variant **cannot be deleted**
- Creating a new product auto-creates a "Standard" default variant
- Admin manages variants on the product edit page
- Storefront shows a variant selector on product detail; variant specifications display below description
- Buy Now requires selecting a variant; orders store variant snapshot info
- Product listing cards show the default variant price (or "From $X" if multiple variants)

## Sale Type & Preorder

Products have a `saleType` field:

| Sale Type | Behavior |
| --------- | -------- |
| `IN_STOCK` | Normal sale, preorder dates are cleared |
| `PREORDER` | Shows preorder date range and estimated ship date on storefront |

Admin can set preorder start/end dates and estimated ship date on the product edit page. When sale type is "In Stock", the preorder date fields are hidden.

## Product Image Upload (Tencent COS)

Product cover images are uploaded directly from the admin frontend to Tencent Cloud COS using temporary credentials. The flow:

1. Admin frontend requests temporary STS credentials from `GET /api/admin/uploads/cos-sts`
2. Backend generates time-limited credentials (30 min) using Tencent STS SDK
3. Frontend uses `cos-js-sdk-v5` to upload directly to COS
4. The resulting public URL is saved as the product's `imageUrl`

**No permanent cloud secrets are exposed to the frontend.**

### COS Bucket Setup

In Tencent Cloud Console, configure your COS bucket CORS:

| Setting | Value |
| ------- | ----- |
| Allowed Origin | `http://localhost:3002` (add your admin domain in production) |
| Allowed Methods | `GET, POST, PUT, HEAD` |
| Allowed Headers | `*` |
| Expose Headers | `ETag, Content-Length` |
| Max Age | `600` |

### Testing Image Upload

1. Set `TENCENT_COS_*` variables in `apps/api/.env`
2. Start backend: `pnpm dev:api`
3. Start admin: `pnpm dev:admin`
4. Go to http://localhost:3002/products/create
5. Click "Upload Image" and select a file
6. The image uploads to COS and the URL auto-fills

If COS is not configured, you can still paste image URLs manually.

## Multi-Image Product Management

Products support multiple images managed via the admin dashboard.

### Image Lifecycle

| Status | Meaning |
| ------ | ------- |
| TEMP | Uploaded to COS but not yet saved with a product |
| USED | Attached to a product after save |
| DELETED | Cleaned up from COS by the cleanup job |

**Flow:**
1. Admin uploads image → file goes to COS, registered as TEMP (expires in 24h)
2. Admin saves product with image → backend marks UploadFile as USED
3. If admin cancels/refreshes → TEMP file expires and cleanup job removes it

**Why not delete on cancel?** Browser refreshes and navigation are unpredictable. The cleanup job safely handles orphaned uploads.

### Primary Image

Each product can have one primary image. `Product.imageUrl` is always kept in sync with the primary image URL. If the primary is deleted, the next image by sort order becomes primary.

### Cleanup Job

A cron job runs every hour to delete expired TEMP uploads from both COS and the database. Configure the expiry with `UPLOAD_TEMP_EXPIRE_HOURS` (default: 24).

### Limitations

- Removing a ProductImage relation does not immediately delete the COS object (handled by cleanup job)
- No drag-and-drop reorder yet (use up/down buttons)

## Build

```bash
pnpm build
```

## Lint & Format

```bash
pnpm lint
pnpm format
```
