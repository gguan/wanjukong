# wanjukong

Minimal monorepo skeleton with Nuxt 3 (frontend) and NestJS (backend).

## Tech Stack

- **Frontend:** Nuxt 3 + TypeScript
- **Backend:** NestJS + TypeScript
- **Package Manager:** pnpm (workspaces)
- **Node.js:** 20+

## Project Structure

```
wanjukong/
├── apps/
│   ├── web/          # Nuxt 3 frontend (port 3000)
│   └── api/          # NestJS backend (port 3001)
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

### Installation

```bash
pnpm install
```

### Environment Variables

Copy the example env files:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
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
