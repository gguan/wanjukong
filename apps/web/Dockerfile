FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Install dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM deps AS build
WORKDIR /app
COPY apps/web/ apps/web/
RUN pnpm --filter @wanjukong/web build

# ── Production ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root user so any RCE inside the container has minimal reach.
RUN addgroup -S app && adduser -S -G app app

COPY --from=build --chown=app:app /app/apps/web/.output ./apps/web/.output
COPY --chown=app:app apps/web/package.json ./apps/web/

USER app

EXPOSE 3000
CMD ["node", "apps/web/.output/server/index.mjs"]
