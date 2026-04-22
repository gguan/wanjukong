FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Install dependencies (full, for build) ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM deps AS build
COPY apps/api/ apps/api/
RUN pnpm --filter @wanjukong/api build

# ── Prod dependencies only (no dev deps in final image) ──
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/web/package.json apps/web/
RUN pnpm install --prod --frozen-lockfile --filter @wanjukong/api...

# ── Production ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root user so any RCE inside the container has minimal reach.
RUN addgroup -S app && adduser -S -G app app

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=prod-deps --chown=app:app /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --chown=app:app apps/api/prisma ./apps/api/prisma
COPY --chown=app:app apps/api/package.json ./apps/api/

WORKDIR /app/apps/api
RUN npx prisma generate && chown -R app:app /app/apps/api

USER app

EXPOSE 3001
# Apply pending migrations on startup, then launch the server.
# `migrate deploy` is safe for production — only applies committed migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
