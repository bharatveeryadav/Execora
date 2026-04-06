# =============================================================================
# Execora Worker — Multi-stage Docker build
# Context: workspace root (execora/)
# Build:   docker build -f apps/worker/Dockerfile .
# =============================================================================

FROM node:20-bullseye-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json           ./packages/types/package.json
COPY packages/infrastructure/package.json  ./packages/infrastructure/package.json
COPY packages/db/package.json              ./packages/db/package.json
COPY packages/modules/package.json         ./packages/modules/package.json
COPY apps/worker/package.json              ./apps/worker/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/db ./packages/db/
RUN pnpm db:generate

COPY packages/types/src           ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/tsconfig.json

COPY packages/infrastructure/src          ./packages/infrastructure/src
COPY packages/infrastructure/tsconfig.json ./packages/infrastructure/tsconfig.json

COPY packages/modules/src         ./packages/modules/src
COPY packages/modules/tsconfig.json ./packages/modules/tsconfig.json

COPY apps/worker/src              ./apps/worker/src
COPY apps/worker/tsconfig.json    ./apps/worker/tsconfig.json
COPY turbo.json                   ./turbo.json

RUN pnpm build --filter=@execora/worker...

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-bullseye-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json           ./packages/types/package.json
COPY packages/infrastructure/package.json  ./packages/infrastructure/package.json
COPY packages/db/package.json              ./packages/db/package.json
COPY packages/modules/package.json         ./packages/modules/package.json
COPY apps/worker/package.json              ./apps/worker/package.json
COPY --from=builder /app/packages/db       ./packages/db

RUN pnpm install --frozen-lockfile --prod
RUN pnpm db:generate

COPY --from=builder /app/packages/types/dist         ./packages/types/dist
COPY --from=builder /app/packages/infrastructure/dist ./packages/infrastructure/dist
COPY --from=builder /app/packages/modules/dist        ./packages/modules/dist
COPY --from=builder /app/apps/worker/dist             ./apps/worker/dist

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
