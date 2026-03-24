# wanjukong

Minimal monorepo skeleton with Nuxt 3 (frontend) and NestJS (backend).

## Tech Stack

- **Frontend:** Nuxt 3 + TypeScript
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
│       └── prisma/   # Prisma schema and migrations
├── infra/
│   └── docker-compose.yml  # PostgreSQL
├── packages/
│   └── shared/       # Shared constants and types
├── package.json
├── pnpm-workspace.yaml
└── .nvmrc
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL) or PostgreSQL 16 installed locally

### Installation

```bash
pnpm install
```

### Environment Variables

Copy the example env files:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
```

### Database Setup

Start PostgreSQL via Docker:

```bash
pnpm db:up
```

Run Prisma migrations:

```bash
pnpm db:migrate
```

Generate Prisma client:

```bash
pnpm db:generate
```

Seed the database:

```bash
pnpm db:seed
```

Stop PostgreSQL:

```bash
pnpm db:down
```

### Running

Run both frontend and backend:

```bash
pnpm dev
```

Run individually:

```bash
# Frontend only (http://localhost:3000)
pnpm dev:web

# Backend only (http://localhost:3001)
pnpm dev:api

# Admin only (http://localhost:3002)
pnpm dev:admin
```

### Build

```bash
pnpm build
```

### Lint & Format

```bash
pnpm lint
pnpm format
```

## API Endpoints

| Method | Path          | Description  |
| ------ | ------------- | ------------ |
| GET    | `/api/health` | Health check |

## Default Ports

| App      | Port |
| -------- | ---- |
| Frontend | 3000 |
| Admin    | 3002 |
| Backend  | 3001 |

## Environment Variables

### Frontend (`apps/web/.env`)

| Variable              | Default                 | Description      |
| --------------------- | ----------------------- | ---------------- |
| `NUXT_PUBLIC_API_BASE` | `http://localhost:3001` | Backend API URL  |

### Backend (`apps/api/.env`)

| Variable      | Default                 | Description            |
| ------------- | ----------------------- | ---------------------- |
| `PORT`        | `3001`                  | API server port        |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin    |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/wanjukong` | PostgreSQL connection string |

### Admin (`apps/admin/.env`)

| Variable                 | Default                 | Description     |
| ------------------------ | ----------------------- | --------------- |
| `NUXT_PUBLIC_API_BASE_URL` | `http://localhost:3001` | Backend API URL |

### Admin Login

The admin app uses a fake login for now. Any email/password will work. Authentication is placeholder only and will be replaced with real auth in a future step.
