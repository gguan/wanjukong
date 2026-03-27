FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# ── Install dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM deps AS build
WORKDIR /app
COPY apps/admin/ apps/admin/
RUN pnpm --filter @wanjukong/admin build

# ── Production ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/admin/.output ./apps/admin/.output
COPY apps/admin/package.json ./apps/admin/

EXPOSE 3002
CMD ["node", "apps/admin/.output/server/index.mjs"]
