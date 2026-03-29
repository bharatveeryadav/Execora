# Execora — Claude Instructions

## Stack
TypeScript monorepo. Package manager: pnpm. Build: Turborepo.

## Structure
```
apps/api/       @execora/api     — Fastify server, WebSocket, REST routes
apps/worker/    @execora/worker  — BullMQ job processor
packages/
  types/          @execora/types          — shared TS types
  infrastructure/ @execora/infrastructure — config, logger, DB, Redis, queue, auth, metrics
  modules/        @execora/modules        — business services, voice engine, STT/TTS
prisma/           — schema lives at workspace root
```

## Key Commands
```bash
pnpm dev          # API in watch mode
pnpm worker       # worker in watch mode
pnpm build        # turbo build all
pnpm db:generate  # prisma generate
pnpm db:push      # prisma db push
```

## Rules

**Imports** — always barrel imports, never sub-path:
```ts
import { logger, prisma } from '@execora/infrastructure';  // correct
import { logger } from '@execora/infrastructure/logger';   // BROKEN
```

**Fastify typed routes** — hoist generic to method when using preHandler + typed params:
```ts
fastify.get<{ Params: { id: string } }>('/x/:id', { preHandler: [...] }, handler)
```

**Invoice status** — valid: `draft | pending | partial | paid | cancelled`. Never use `issued` (legacy).

**Auth** — platform admin: `x-admin-api-key` → `/admin/*`. Business users: JWT → `/api/v1/*`.
Roles: owner > admin > manager > staff > viewer. Middleware: `apps/api/src/api/middleware/require-auth.ts`.

**Prisma Product fields** — use `cost` not `costPrice`. `gstRate`, `hsnCode`, `mrp`, `cost` all exist.

## Infrastructure
- API port: 3006
- DB: PostgreSQL (Prisma). Queue: BullMQ + Redis. Storage: MinIO. Metrics: Prometheus.
- Dockerfiles: `apps/api/Dockerfile`, `apps/worker/Dockerfile` (build context: workspace root)
- Prod overlay: `docker-compose.prod.yml`

## Tests (packages/modules)
```bash
node_modules/.bin/tsc -p packages/modules/tsconfig.test.json
timeout 15 node --test packages/modules/dist-test/__tests__/<name>.test.js
```
- Runner: Node `node:test` + `assert/strict`. Use `timeout` — process hangs after tests (ioredis keepalive).
- `createInvoice` auto-creates missing products (price=0, stock=9999).
- `generateInvoiceNo` uses `tx.$queryRaw` → mock as `$queryRaw: async () => [{ last_seq: 1 }]`.
- `findOrCreateProduct` uses both `tx.product.findFirst` AND `tx.product.findMany` — mock both.

## Frontend (apps/web)
React 18 + Vite + TypeScript + Tailwind + React Query v5. Dev: port 5173.
Path alias `@/` → `src/`. Auth keys: `execora_token`, `execora_refresh`, `execora_user` in localStorage.
IDE diagnostics are often stale — verify real errors with `npx tsc --noEmit`.

## Architecture Modes
- **Mode 1 Voice**: STT → LLM extracts JSON → switch(intent) → handler. Deterministic.
- **Mode 2 Classic**: React form → REST API → service → WebSocket broadcast. No AI.
- **Mode 3 Agent**: PLANNED. LLM chains tool calls. See `docs/README.md` Section 6.

## Before building any feature
Read `docs/README.md` Section 13 (Built vs Pending) first.
