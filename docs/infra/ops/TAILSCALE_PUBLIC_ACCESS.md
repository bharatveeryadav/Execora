> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora Public Access via Tailscale Funnel

Expose Execora API securely to the public internet using Tailscale Funnel.

## What was added

- `docker-compose.tailscale.yml`
  - Binds core ports to `127.0.0.1`.
  - Disables dev/admin UIs by default via profile gating.
- `scripts/deploy/tailscale-public.sh`
  - Starts production stack and enables Funnel to `http://127.0.0.1:3006`.
- `scripts/deploy/tailscale-stop.sh`
  - Resets Funnel and stops stack.
- `package.json` scripts:
  - `npm run deploy:tailscale`
  - `npm run deploy:tailscale:stop`

## Prerequisites

- Docker + Docker Compose
- Tailscale installed and logged in on the host
- Project `.env` configured at repo root

## One-time operator permission fix (recommended)

If you see `Access denied: serve config denied`, run:

```bash
sudo tailscale set --operator=$USER
```

Then re-open shell (or log out/in) and continue.

## Deploy and expose publicly

From repo root:

```bash
npm run deploy:tailscale
```

This performs:

1. `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tailscale.yml up -d --build`
2. Health check on `http://127.0.0.1:3006/health`
3. `tailscale funnel --bg --https=443 http://127.0.0.1:3006`

## Check public URL

```bash
tailscale funnel status
```

## Stop / rollback

```bash
npm run deploy:tailscale:stop
```

## Notes

- WebSockets are supported through Funnel for the API endpoint.
- If you already have Funnel rules on `/`, update/reset them before mapping Execora:

```bash
tailscale funnel reset
tailscale funnel --bg --https=443 http://127.0.0.1:3006
```
