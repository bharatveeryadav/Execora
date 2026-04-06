# =============================================================================
# Execora API — Multi-stage Docker build
# Context: workspace root (execora/)
# Build:   docker build -f apps/api/Dockerfile .
# =============================================================================

FROM node:20-bullseye-slim AS builder

# Prisma requires OpenSSL
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy workspace manifests first (layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/package.json
COPY packages/shared/package.json      ./packages/shared/package.json
COPY packages/infrastructure/package.json ./packages/infrastructure/package.json
COPY packages/db/package.json          ./packages/db/package.json
COPY packages/modules/package.json     ./packages/modules/package.json
COPY apps/api/package.json             ./apps/api/package.json

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy Prisma schema and generate client
COPY packages/db ./packages/db/
RUN pnpm db:generate

# Copy all source files
COPY packages/types/src        ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json

COPY packages/shared/src       ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json

COPY packages/infrastructure/src       ./packages/infrastructure/src
COPY packages/infrastructure/tsconfig.json ./packages/infrastructure/tsconfig.json

COPY packages/modules/src      ./packages/modules/src
COPY packages/modules/tsconfig.json ./packages/modules/tsconfig.json

COPY apps/api/src              ./apps/api/src
COPY apps/api/tsconfig.json    ./apps/api/tsconfig.json
COPY turbo.json                ./turbo.json

# Build all packages in dependency order via Turborepo
RUN pnpm build --filter=@execora/api...

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-bullseye-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/package.json
COPY packages/shared/package.json      ./packages/shared/package.json
COPY packages/infrastructure/package.json ./packages/infrastructure/package.json
COPY packages/db/package.json          ./packages/db/package.json
COPY packages/modules/package.json     ./packages/modules/package.json
COPY apps/api/package.json             ./apps/api/package.json
COPY --from=builder /app/packages/db   ./packages/db

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod
RUN pnpm db:generate

# Copy compiled artifacts
COPY --from=builder /app/packages/types/dist        ./packages/types/dist
COPY --from=builder /app/packages/shared/dist       ./packages/shared/dist
COPY --from=builder /app/packages/infrastructure/dist ./packages/infrastructure/dist
COPY --from=builder /app/packages/modules/dist      ./packages/modules/dist
COPY --from=builder /app/apps/api/dist              ./apps/api/dist

# Copy static assets
COPY apps/api/public ./apps/api/public

RUN mkdir -p /app/logs

EXPOSE 3006

WORKDIR /app/apps/api

CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema ../../packages/db/schema.prisma && node dist/index.js"]
