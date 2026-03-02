#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if command -v tailscale >/dev/null 2>&1; then
  echo "🛑 Resetting Tailscale Funnel config..."
  tailscale funnel reset || true
fi

echo "🧹 Stopping Execora stack (tailscale mode)..."
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.tailscale.yml \
  down

echo "✅ Stopped."
