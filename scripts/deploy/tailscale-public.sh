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

if ! tailscale status --self >/dev/null 2>&1; then
  echo "❌ Tailscale is not authenticated on this host. Run: tailscale up"
  exit 1
fi

echo "🚀 Starting Execora production stack (tailscale mode)..."
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.tailscale.yml \
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

echo "🌐 Enabling Tailscale Funnel (public HTTPS -> localhost:3006)..."
if ! tailscale funnel --bg --https=443 http://127.0.0.1:3006; then
  echo ""
  echo "❌ Could not update Tailscale Funnel config from current user."
  echo "Run one-time to allow non-root changes:"
  echo "  sudo tailscale set --operator=$USER"
  echo "Then re-run: npm run deploy:tailscale"
  exit 1
fi

echo "✅ Deployment complete. Public endpoint status:"
tailscale funnel status
