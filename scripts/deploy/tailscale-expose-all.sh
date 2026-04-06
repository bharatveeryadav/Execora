#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "❌ Missing .env at project root. Create it from .env.example first."
  exit 1
fi

if ! command -v tailscale >/dev/null 2>&1; then
  echo "❌ tailscale CLI not found. Install Tailscale first: https://tailscale.com/download"
  exit 1
fi

echo "🚀 Starting Execora stack with admin tools (tailscale expose-all mode)..."

if [[ -n "${POSTGRES_PASSWORD:-}" && -n "${REDIS_PASSWORD:-}" && -n "${MINIO_ROOT_USER:-}" && -n "${MINIO_ROOT_PASSWORD:-}" ]]; then
  COMPOSE_FILES=( -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.prod.yml -f infra/docker/docker-compose.tailscale.yml )
  echo "ℹ️ Using production override files."
else
  COMPOSE_FILES=( -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.tailscale.yml )
  echo "⚠️ Production secrets are missing in environment; using non-prod compose mode."
  echo "   Set POSTGRES_PASSWORD, REDIS_PASSWORD, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD for prod mode."
fi

docker compose \
  --profile dev-tools \
  "${COMPOSE_FILES[@]}" \
  up -d --build

echo "⏳ Waiting for API health at http://127.0.0.1:3006/health ..."
healthy="0"
for _ in {1..45}; do
  if curl -fsS http://127.0.0.1:3006/health >/dev/null; then
    healthy="1"
    break
  fi
  sleep 2
done

if [[ "$healthy" != "1" ]]; then
  echo "❌ API did not become healthy in time. Check: docker compose logs app"
  exit 1
fi

echo "🌐 Resetting previous funnel config..."
if ! tailscale funnel reset; then
  echo "❌ Could not reset Funnel config."
  echo "Run one-time permission fix: sudo tailscale set --operator=$USER"
  exit 1
fi

echo "🌐 Enabling path routes on public Funnel URL..."
tailscale funnel --bg --https=443 --set-path=/api http://127.0.0.1:3006
tailscale funnel --bg --https=443 --set-path=/health http://127.0.0.1:3006/health
tailscale funnel --bg --https=443 --set-path=/metrics http://127.0.0.1:3006/metrics
tailscale funnel --bg --https=443 --set-path=/pgadmin http://127.0.0.1:15050
tailscale funnel --bg --https=443 --set-path=/adminer http://127.0.0.1:18081
tailscale funnel --bg --https=443 --set-path=/redis http://127.0.0.1:18082
tailscale funnel --bg --https=443 --set-path=/minio http://127.0.0.1:19001

echo "✅ Expose-all complete. Current public routes:"
tailscale funnel status
