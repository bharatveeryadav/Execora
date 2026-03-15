# =============================================================================
# Execora Web — Multi-stage build
# Stage 1: Build React/Vite app
# Stage 2: Serve with nginx
# Context: workspace root (execora/)
# Build:   docker build -f apps/web/Dockerfile .
# =============================================================================

FROM node:20-bullseye-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

# Copy workspace manifests (layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json

# Install only web deps
RUN pnpm install --frozen-lockfile --filter=@execora/web...

# Copy source
COPY apps/web ./apps/web

# Build — outputs to apps/web/dist
WORKDIR /app/apps/web
RUN pnpm build

# ── Production image — nginx serving static files ─────────────────────────────
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
