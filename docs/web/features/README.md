> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Features (Canonical)

This file is the single active feature reference for the current backend.

## Backend Feature Surface

Current feature routes are wired in `packages/api/src/api/index.ts` and grouped as:

- Public:
  - auth (`/api/v1/auth/*`)
  - webhooks (`/webhooks/*`)
  - public invoice portal (`/pub/invoice/:id/:token`)
  - demo endpoints (`/api/v1/demo-*`)
- JWT protected scope:
  - customers, products, invoices, ledger, reminders, sessions
  - users, reports, expenses, ai, drafts, credit-notes
  - monitoring, feedback, push notifications
  - suppliers, purchase-orders

Admin queue dashboard exists at `/admin/queues` and is protected via admin middleware.

## 1. Voice + Realtime

Source of truth:

- `packages/api/src/ws/enhanced-handler.ts`
- `packages/api/src/ws/rtc-relay.ts`

Capabilities:

- WebSocket session handling with JWT query-token verification
- Live STT/TTS orchestration through module providers
- Realtime command processing and response push
- Tenant-aware broadcasting and RTC signalling relay
- Voice command metrics for observability

Notes:

- `/ws` rejects missing/invalid token.
- `USE_ENHANCED_AUDIO` controls enhanced websocket handler usage.

## 2. Auth and Access Model

Source of truth:

- `packages/api/src/index.ts`
- `packages/api/src/api/middleware/require-auth.ts`
- `packages/api/src/api/middleware/admin-auth.ts`

Capabilities:

- Request-scoped context with tenant/user propagation
- JWT-based protected REST scope (`/api/v1/*` protected group)
- Admin key middleware for operational admin endpoints

## 3. Operational Safety

Source of truth:

- `packages/api/src/index.ts`
- `packages/api/src/api/index.ts`

Capabilities:

- Health check with database and Redis status (`GET /health`)
- Global error handling via centralized error formatter/logger
- Global rate limiting, CORS, helmet, multipart protection
- Request ID propagation via `x-request-id`

## 4. Core Business Domains

Domain modules are consumed from `@execora/modules` via route registrars.

Primary backend domains:

- Customer management
- Product and inventory
- Invoice lifecycle
- Ledger and payment recording
- Reminder scheduling and queue-backed delivery
- Reports and summaries
- Supplier and purchase order flow
- Draft/staging and credit note workflows

## 5. Queue + Async Features

Source of truth:

- Queue adapters are mounted in `packages/api/src/api/index.ts`
- Workers are started in `packages/api/src/index.ts` via infrastructure bootstrap

Capabilities:

- BullMQ queues for reminders, WhatsApp/media, and OCR jobs
- Admin queue inspection through Bull Board
- Worker lifecycle hooks on startup/shutdown

## 6. Feature Validation Checklist

- Route exists under expected auth scope (public/JWT/admin).
- Health check remains green for DB and Redis.
- WebSocket rejects invalid/missing token and accepts valid token.
- Logs include request ID and structured error context.
- Metrics are exposed and scrapeable.

## 7. Current Commands

```bash
pnpm dev
pnpm worker
pnpm build
pnpm typecheck
pnpm db:push
pnpm docker:up
pnpm docker:ps
pnpm docker:logs
```

## Legacy Detailed Feature Docs

Historical deep dives are preserved in archive and intentionally not edited:

- `../archive/legacy/features/AUDIO_INTEGRATION_legacy.md`
- `../archive/legacy/features/CONVERSATION_MEMORY_legacy.md`
- `../archive/legacy/features/ERROR_HANDLING_legacy.md`
- `../archive/legacy/features/INDIAN_FUZZY_MATCHING_legacy.md`
- `../archive/legacy/features/LLM_BASED_CACHING_GUIDE_legacy.md`
- `../archive/legacy/features/MULTITASK_REALTIME_legacy.md`
