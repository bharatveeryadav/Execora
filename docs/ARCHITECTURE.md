# Execora — Architecture & Engineering Journal

> **Who this is for:** Any developer (new contributor, future maintainer, or the original author returning after months) who wants to understand how Execora is built, why it is structured the way it is, and how to evolve it.

---

## Table of Contents

1. [What is Execora?](#1-what-is-execora)
2. [Full Technology Stack](#2-full-technology-stack)
3. [Current Folder Structure](#3-current-folder-structure)
4. [The Restructuring Journey](#4-the-restructuring-journey)
   - 4.1 [Why we restructured](#41-why-we-restructured)
   - 4.2 [Decision: module-based over layer-based](#42-decision-module-based-over-layer-based)
   - 4.3 [Complete old → new file map](#43-complete-old--new-file-map)
5. [Error Handling Strategy](#5-error-handling-strategy)
6. [Observability Stack](#6-observability-stack)
7. [Docker & Networking](#7-docker--networking)
8. [Database Schema](#8-database-schema)
9. [Technology-Agnostic Design Principles](#9-technology-agnostic-design-principles)
10. [Open-Source Contribution Guide](#10-open-source-contribution-guide)

---

## 1. What is Execora?

Execora is a **voice-first business management engine** built specifically for Indian small-and-medium merchants (SMEs) who need to manage customers, invoices, ledger accounts, and payment reminders — all by speaking naturally in Hindi-English (Hinglish).

A merchant speaks into the browser. Execora:
1. Transcribes speech (Deepgram STT)
2. Understands the business intent (OpenAI GPT-4o)
3. Executes the action (create invoice, record payment, schedule reminder)
4. Responds with voice (ElevenLabs or OpenAI TTS)
5. Sends WhatsApp reminders automatically via BullMQ workers

---

## 2. Full Technology Stack

### Runtime & Language
| Layer | Technology | Why chosen |
|---|---|---|
| Runtime | Node.js 20 LTS | Broad ecosystem, Docker-friendly |
| Language | TypeScript 5.3 (strict mode) | Type safety, refactor confidence |
| Transpile (dev) | `tsx` (esbuild-based) | 10x faster than `ts-node` in watch mode |
| Transpile (prod) | `tsc` → `dist/` | Standard, no runtime overhead |

### API Server
| Layer | Technology | Why chosen |
|---|---|---|
| HTTP Framework | Fastify 4 | 2× faster than Express, built-in schema validation, plugin system |
| WebSocket | `@fastify/websocket` | Integrates cleanly with Fastify lifecycle |
| CORS | `@fastify/cors` | Fastify-native |
| File upload | `@fastify/multipart` | Streaming multipart, memory efficient |
| Static files | `@fastify/static` | Serves `/public` for frontend |

### Database & Storage
| Layer | Technology | Why chosen |
|---|---|---|
| Primary DB | PostgreSQL 15 | ACID transactions (critical for ledger/invoice) |
| ORM | Prisma 5 | Type-safe queries, migration management |
| Cache & Queue store | Redis 7 | Fast, reliable, BullMQ native |
| Object storage | MinIO (S3-compatible) | Self-hosted S3, stores voice recordings |

### Background Jobs
| Layer | Technology | Why chosen |
|---|---|---|
| Queue | BullMQ | Redis-backed, retry/backoff, concurrency control |
| Reminder worker | Custom BullMQ Worker | Processes scheduled WhatsApp sends |
| WhatsApp worker | Custom BullMQ Worker | Handles direct message sends |

### AI / Voice
| Layer | Technology |
|---|---|
| LLM | OpenAI GPT-4o (intent extraction + response) |
| STT (Speech-to-Text) | Deepgram Nova-2 |
| TTS (Text-to-Speech) | ElevenLabs (primary), OpenAI TTS (fallback) |
| Fuzzy name matching | Custom `fuzzy-match.ts` (Hinglish-aware Levenshtein) |

### Observability
| Layer | Technology |
|---|---|
| Structured logging | Pino (JSON, written to `logs/app.log`) |
| Metrics | `prom-client` → exposed at `/metrics` |
| Metrics storage | Prometheus |
| Dashboards | Grafana |
| Log aggregation | Loki + Promtail |
| System metrics | Node Exporter |

### Infrastructure
| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| App compose | `docker-compose.yml` |
| Monitoring compose | `docker-compose.monitoring.yml` |
| Shared network | `execora-network` (named bridge) |

---

## 3. Current Folder Structure

```
execora/
├── src/
│   ├── index.ts                    # Server entry point
│   ├── config.ts                   # All env vars, typed & validated
│   ├── types.ts                    # Shared TypeScript interfaces & enums
│   │
│   ├── api/
│   │   └── index.ts                # All HTTP routes (REST API)
│   │
│   ├── infrastructure/             # Technical plumbing — zero business logic
│   │   ├── database.ts             # Prisma client singleton + helpers
│   │   ├── queue.ts                # BullMQ queues + Redis connection
│   │   ├── storage.ts              # MinIO client wrapper
│   │   ├── logger.ts               # Pino logger (file + pretty dev output)
│   │   ├── metrics.ts              # prom-client counters/histograms
│   │   ├── metrics-plugin.ts       # Fastify plugin that registers /metrics
│   │   └── fuzzy-match.ts          # Hinglish-aware name matching algorithm
│   │
│   ├── modules/                    # Business domain — one folder per domain
│   │   ├── customer/
│   │   │   └── customer.service.ts
│   │   ├── invoice/
│   │   │   └── invoice.service.ts
│   │   ├── ledger/
│   │   │   └── ledger.service.ts
│   │   ├── product/
│   │   │   └── product.service.ts
│   │   ├── reminder/
│   │   │   └── reminder.service.ts
│   │   └── voice/
│   │       ├── engine.ts           # Business intent execution engine
│   │       ├── conversation.ts     # Conversation memory (context window)
│   │       ├── session.service.ts  # Voice session lifecycle (DB + MinIO)
│   │       ├── task-queue.ts       # In-process task sequencer
│   │       └── response-template.ts# Hinglish response string templates
│   │
│   ├── integrations/               # Third-party API adapters
│   │   ├── openai.ts               # OpenAI GPT-4o chat completions
│   │   ├── whatsapp.ts             # WhatsApp Business API
│   │   ├── stt/
│   │   │   ├── index.ts            # STT provider selector
│   │   │   ├── deepgram.ts         # Deepgram Nova-2 adapter
│   │   │   └── elevenlabs.ts       # ElevenLabs STT adapter
│   │   └── tts/
│   │       ├── index.ts            # TTS provider selector
│   │       ├── openai.ts           # OpenAI TTS adapter
│   │       └── elevenlabs.ts       # ElevenLabs TTS adapter
│   │
│   ├── ws/                         # WebSocket handlers
│   │   ├── handler.ts              # Basic WebSocket (text only)
│   │   └── enhanced-handler.ts     # Audio WebSocket (full voice pipeline)
│   │
│   ├── worker/
│   │   └── index.ts                # BullMQ worker process (separate process)
│   │
│   └── __tests__/
│       ├── fuzzy-match.test.ts
│       ├── conversation.test.ts
│       └── engine.test.ts
│
├── prisma/
│   ├── schema.prisma               # DB schema (single source of truth)
│   └── seed.ts                     # Dev seed data
│
├── monitoring/
│   ├── prometheus.yml              # Prometheus scrape config
│   ├── loki-config.yml             # Loki storage config
│   ├── promtail-config.yml         # Promtail log shipping config
│   └── grafana/
│       ├── provisioning/           # Auto-provision Grafana datasources
│       └── dashboards/             # Pre-built Grafana dashboards
│
├── public/                         # Static frontend files
│   └── index-audio.html            # Voice UI (vanilla JS, WebSocket client)
│
├── logs/                           # Runtime log files (git-ignored)
│   └── app.log                     # JSON structured logs (Promtail reads this)
│
├── docker-compose.yml              # App stack (postgres, redis, minio, app, worker)
├── docker-compose.monitoring.yml   # Observability stack (prometheus, grafana, loki...)
├── Dockerfile                      # API server image
├── Dockerfile.worker               # Worker process image
├── tsconfig.json
├── package.json
└── run-tests.sh
```

---

## 4. The Restructuring Journey

### 4.1 Why we restructured

The original codebase used a **layer-based** structure:

```
src/
├── business/     ← all domain logic mixed together
├── services/     ← all third-party integrations mixed together
├── lib/          ← all infrastructure mixed together
├── config/       ← config with index.ts wrapper
├── types/        ← types with index.ts wrapper
└── routes/       ← all routes
```

**Problems with this layout:**

| Problem | Impact |
|---|---|
| No boundaries between domains | Changing invoice logic required understanding all of `business/` |
| `lib/` contained unrelated things (logger, metrics, MinIO, queue, fuzzy-match) | Hard to know what to edit for a specific change |
| `services/` mixed integrations (OpenAI, Deepgram, WhatsApp) | Swapping providers required grep-ing the whole folder |
| Impossible to extract a domain to a separate package | Large refactors required for package extraction |
| `config/index.ts` and `types/index.ts` unnecessary wrappers | Adds indirection for no reason |

### 4.2 Decision: module-based over layer-based

We evaluated two alternatives:

**Option A — Layer-based (what we had)**
```
src/controllers/ + src/services/ + src/repositories/
```
- Good for: small CRUD apps
- Bad for: domain-heavy apps, future package extraction

**Option B — Module-based (what we chose)**
```
src/modules/<domain>/ + src/infrastructure/ + src/integrations/
```
- Good for: domain clarity, future package extraction, open-source contributor navigation
- Based on: NestJS conventions, Fastify production repos

**Why module-based wins for Execora:**
- Each `modules/<domain>` folder is a **complete vertical slice** — if we extract `modules/invoice/` into a separate npm package, zero refactoring is needed
- `infrastructure/` makes it immediately obvious that these files have no business logic
- `integrations/` makes it immediately obvious that these are thin adapters — you can swap Deepgram for Whisper by only touching `integrations/stt/`

### 4.3 Complete old → new file map

Every single file that was moved, with the exact old path and new path:

#### Infrastructure (was `lib/`)

| Old path | New path | What changed |
|---|---|---|
| `src/lib/logger.ts` | `src/infrastructure/logger.ts` | Path only |
| `src/lib/database.ts` | `src/infrastructure/database.ts` | Path only |
| `src/lib/metrics.ts` | `src/infrastructure/metrics.ts` | Path only |
| `src/lib/metrics-plugin.ts` | `src/infrastructure/metrics-plugin.ts` | Path only |
| `src/lib/minio.ts` | `src/infrastructure/storage.ts` | Renamed (clearer intent) + `console.*` → `logger` |
| `src/lib/queue.ts` | `src/infrastructure/queue.ts` | Path only |
| `src/lib/indian-fuzzy-match.ts` | `src/infrastructure/fuzzy-match.ts` | Renamed (dropped redundant `indian-` prefix) |

#### Business Logic (was `business/`)

| Old path | New path | What changed |
|---|---|---|
| `src/business/execution-engine.ts` | `src/modules/voice/engine.ts` | Moved to correct domain |
| `src/business/conversation-memory.service.ts` | `src/modules/voice/conversation.ts` | Moved + renamed |
| `src/business/voice-session.service.ts` | `src/modules/voice/session.service.ts` | Moved |
| `src/business/response-templates.ts` | `src/modules/voice/response-template.ts` | Moved |
| `src/business/task-queue.ts` | `src/modules/voice/task-queue.ts` | Moved |
| `src/business/customer.service.ts` | `src/modules/customer/customer.service.ts` | Moved to domain folder |
| `src/business/invoice.service.ts` | `src/modules/invoice/invoice.service.ts` | Moved to domain folder |
| `src/business/ledger.service.ts` | `src/modules/ledger/ledger.service.ts` | Moved to domain folder |
| `src/business/product.service.ts` | `src/modules/product/product.service.ts` | Moved to domain folder |
| `src/business/reminder.service.ts` | `src/modules/reminder/reminder.service.ts` | Moved to domain folder |

#### Third-party Integrations (was `services/`)

| Old path | New path | What changed |
|---|---|---|
| `src/services/openai.service.ts` | `src/integrations/openai.ts` | Moved + renamed |
| `src/services/whatsapp.service.ts` | `src/integrations/whatsapp.ts` | Moved + renamed |
| `src/services/stt.service.ts` | `src/integrations/stt/index.ts` | Moved into provider subfolder |
| `src/services/stt-deepgram.ts` | `src/integrations/stt/deepgram.ts` | Moved |
| `src/services/stt-elevenlabs.ts` | `src/integrations/stt/elevenlabs.ts` | Moved |
| `src/services/tts.service.ts` | `src/integrations/tts/index.ts` | Moved into provider subfolder |
| `src/services/tts-openai.ts` | `src/integrations/tts/openai.ts` | Moved |
| `src/services/tts-elevenlabs.ts` | `src/integrations/tts/elevenlabs.ts` | Moved |

#### API Routes (was `routes/`)

| Old path | New path | What changed |
|---|---|---|
| `src/routes/index.ts` | `src/api/index.ts` | Moved |

#### WebSocket (was `websocket/`)

| Old path | New path | What changed |
|---|---|---|
| `src/websocket/handler.ts` | `src/ws/handler.ts` | Folder renamed (shorter) |
| `src/websocket/enhanced-handler.ts` | `src/ws/enhanced-handler.ts` | Folder renamed |

#### Config & Types (flattened)

| Old path | New path | Why |
|---|---|---|
| `src/config/index.ts` | `src/config.ts` | Removed unnecessary `index.ts` wrapper |
| `src/types/index.ts` | `src/types.ts` | Removed unnecessary `index.ts` wrapper |

> **Note:** TypeScript resolves `import './config'` to both `config/index.ts` and `config.ts` identically. No import changes were needed for callers.

#### Tests

| Old path | New path | Notes |
|---|---|---|
| `src/lib/indian-fuzzy-match.test.ts` | `src/__tests__/fuzzy-match.test.ts` | Consolidated |
| `src/business/conversation-memory.service.test.ts` | `src/__tests__/conversation.test.ts` | Consolidated |
| `src/business/execution-engine.test.ts` | `src/__tests__/engine.test.ts` | Consolidated |

#### Bugs discovered and fixed during restructure

| File | Bug | Fix |
|---|---|---|
| `package.json` | `test` script pointed to `dist/tests/` (old path) | Updated to `dist/__tests__/**/*.test.js` |
| `run-tests.sh` | Both `npx ts-node` paths pointed to deleted locations | Updated to `src/__tests__/*.test.ts` |
| `docker-compose.yml` | `version: '3.8'` is obsolete (Docker Compose V2) | Removed |
| `docker-compose.monitoring.yml` | Same obsolete `version:` field | Removed |
| `docker-compose.yml` | Network `execora-network` had no `name:` — Docker auto-prefixed it as `execora_execora-network` | Added `name: execora-network` |
| `docker-compose.monitoring.yml` | External network had `driver: bridge` (invalid on external nets) | Removed `driver:` line |
| `monitoring/prometheus.yml` | Referenced `postgres-exporter` and `redis-exporter` containers that don't exist | Commented out with upgrade instructions |

---

## 5. Error Handling Strategy

### The problem we found

The original code had **18 HTTP routes with no try/catch**. Any thrown error would result in Fastify's default unformatted 500 response — no logging, no structured error body.

Additionally:
- `process.on('unhandledRejection')` logged but did NOT exit — leaving zombie processes
- Worker DB writes after successful WhatsApp sends could fail and cause BullMQ to re-queue an already-delivered message (double send)
- If `reminderQueue.add()` failed after `prisma.reminder.create()`, the reminder was stuck in `SCHEDULED` forever

### How we fixed it

**1. Fastify global error handler (covers all 18 routes at once)**

```typescript
// src/index.ts
fastify.setErrorHandler((error, request, reply) => {
  logger.error({ error, url: request.url, method: request.method }, 'Request error');
  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    error: statusCode >= 500 ? 'Internal Server Error' : error.message,
    statusCode,
  });
});
```

Why a global handler instead of try/catch in every route?
- DRY — one place to change error format for the entire API
- Fastify propagates all thrown errors up to this handler automatically
- Structured JSON error body every time

**2. unhandledRejection exit**

```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  process.exit(1); // was missing — zombie process risk
});
```

**3. Worker DB writes are non-throwing**

```typescript
// If WhatsApp send succeeded, DB log failure is non-critical
try {
  await prisma.whatsAppMessage.create({ ... });
} catch (dbError) {
  logger.error({ dbError, reminderId }, 'Failed to create record (message was sent)');
  // Do NOT re-throw — message was already delivered
}
```

**4. Reminder queue/DB consistency**

```typescript
try {
  await reminderQueue.add('send-reminder', jobData, options);
} catch (queueError) {
  // Queue failed — orphaned DB record must be cleaned up
  await prisma.reminder.update({
    where: { id: reminder.id },
    data: { status: 'FAILED' },
  }).catch(err => logger.error(err, 'Failed to update reminder status'));
  throw queueError;
}
```

**5. MinIO logging normalized**

`console.log` and `console.error` in `storage.ts` replaced with structured `logger.info`/`logger.error` so all logs are uniform JSON.

### Error handling rules for contributors

| Context | Rule |
|---|---|
| HTTP routes | Do NOT add try/catch — let the global error handler catch it |
| Worker job processors | Wrap the top-level logic, re-throw to let BullMQ handle retries |
| Worker DB writes after an external send | Catch, log, do NOT re-throw |
| Service methods (`modules/`) | Wrap in try/catch, log, re-throw so callers see the error |
| Infrastructure methods | Let errors propagate — callers decide whether to handle or crash |

---

## 6. Observability Stack

The monitoring stack runs in a separate Docker Compose file to keep the app stack clean.

```
Browser → Grafana (port 3001)
              ↓ queries
         Prometheus (port 9090) ← scrapes → execora-app:3000/metrics
         Prometheus              ← scrapes → node-exporter:9100
              ↓ queries
              Loki ← Promtail reads → logs/app.log
```

### Starting monitoring

```bash
# App stack first
docker compose up -d

# Monitoring stack
docker compose -f docker-compose.monitoring.yml up -d
```

Both stacks share the `execora-network` bridge network. Prometheus scrapes `app:3000/metrics` directly by container hostname.

### Available metrics (from `src/infrastructure/metrics.ts`)

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | All HTTP requests, labelled by method/route/status |
| `http_request_duration_seconds` | Histogram | Request latency |
| `voice_sessions_total` | Counter | WebSocket voice sessions |
| `business_operations_total` | Counter | Business actions executed (invoice/ledger/reminder) |

### Adding postgres-exporter and redis-exporter

When ready, uncomment the sections in `monitoring/prometheus.yml` and add these services to `docker-compose.monitoring.yml`:

```yaml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter:latest
  environment:
    DATA_SOURCE_NAME: "postgresql://execora:execora@postgres:5432/execora?sslmode=disable"
  networks:
    - monitoring
    - execora-network

redis-exporter:
  image: oliver006/redis_exporter:latest
  environment:
    REDIS_ADDR: redis://redis:6379
  networks:
    - monitoring
    - execora-network
```

---

## 7. Docker & Networking

### Why two compose files?

| File | Purpose |
|---|---|
| `docker-compose.yml` | Production app stack — postgres, redis, minio, api, worker |
| `docker-compose.monitoring.yml` | Optional observability — prometheus, grafana, loki, promtail, node-exporter |

Separating them allows deploying the app without monitoring overhead, and independently scaling or restarting the observability stack.

### The network naming problem (and fix)

Docker Compose V2 automatically prefixes network names with the project name:
```
network "execora-network" → becomes → "execora_execora-network"
```

This broke cross-stack communication (Prometheus couldn't reach the app container).

**Fix:** Add `name:` to pin the network name:

```yaml
# docker-compose.yml
networks:
  execora-network:
    driver: bridge
    name: execora-network   # ← pins the name, no prefix applied

# docker-compose.monitoring.yml
networks:
  monitoring:              # internal to monitoring stack
  execora-network:
    external: true         # ← joins the pinned network above
                           # NO driver: attribute (invalid on external networks)
```

### Service dependency order

```
postgres (healthcheck: pg_isready)
redis    (healthcheck: redis-cli ping)
minio    (healthcheck: curl /minio/health/live)
  ↓ all healthy
app (depends_on all three with condition: service_healthy)
worker (depends_on postgres + redis)
```

### Why logs don't appear in `docker logs execora-app`

Pino writes to `logs/app.log` (a bind-mounted file), not to stdout. In production, Promtail reads this file and ships logs to Loki. During development, logs appear in the file AND in pretty-printed console output (dev mode only).

To stream logs from the file:
```bash
tail -f logs/app.log | npx pino-pretty
```

---

## 8. Database Schema

PostgreSQL with Prisma ORM. All tables use CUID primary keys.

```
Customer ──< Invoice ──< InvoiceItem >── Product
Customer ──< LedgerEntry
Customer ──< Reminder ──< WhatsAppMessage
ConversationSession ──< ConversationRecording
```

### Domain boundaries

| Domain | Tables | Module |
|---|---|---|
| Customer | `customers` | `modules/customer/` |
| Products & Inventory | `products`, `invoice_items` | `modules/product/`, `modules/invoice/` |
| Invoicing | `invoices`, `invoice_items` | `modules/invoice/` |
| Ledger / Payments | `ledger_entries` | `modules/ledger/` |
| Reminders | `reminders`, `whatsapp_messages` | `modules/reminder/` |
| Voice | `conversation_sessions`, `conversation_recordings` | `modules/voice/` |

### Key Prisma commands

```bash
npm run db:generate   # regenerate Prisma client after schema change
npm run db:push       # sync schema to DB without migration file (dev)
npm run db:migrate    # create migration file (production)
npm run db:studio     # open Prisma Studio UI
npm run seed          # populate dev data
```

---

## 9. Technology-Agnostic Design Principles

The architecture is designed so that **swapping any layer requires touching only one file or folder**. This is the most important property for long-term maintainability and open-source adoption.

### The adapter pattern in `integrations/`

Every third-party integration is a **thin adapter** behind a stable interface.

**Example: Swapping STT provider**

The `integrations/stt/index.ts` exports a single `stt` object. Everything else in the codebase imports this one export. To swap Deepgram for OpenAI Whisper:

```typescript
// integrations/stt/index.ts — only file that changes
import { whisperSTT } from './whisper';   // new file you add
export const stt = whisperSTT;            // was: deepgramSTT
```

Zero changes needed in `ws/enhanced-handler.ts`, `modules/voice/`, or anywhere else.

**Same pattern applies to:**
| Layer | Swap by changing |
|---|---|
| TTS (ElevenLabs → Google TTS) | `integrations/tts/index.ts` |
| STT (Deepgram → Whisper) | `integrations/stt/index.ts` |
| LLM (OpenAI → Anthropic) | `integrations/openai.ts` + interface |
| Message delivery (WhatsApp → SMS) | `integrations/whatsapp.ts` |
| Object storage (MinIO → AWS S3) | `infrastructure/storage.ts` |
| Queue (BullMQ → pg-boss) | `infrastructure/queue.ts` |
| Database (Postgres → MySQL) | `prisma/schema.prisma` + `datasource` change |
| Logger (Pino → Winston) | `infrastructure/logger.ts` |
| HTTP framework (Fastify → Express) | `src/index.ts` + `src/api/index.ts` |

### Moving to a different runtime

**Node.js → Bun**
```bash
# Replace in package.json:
"dev": "bun --watch src/index.ts"    # was: tsx watch
"build": "bun build src/index.ts"    # was: tsc (keep tsc for type-checking)
# Dockerfile: FROM oven/bun:1 instead of node:20-alpine
```
All application code stays unchanged.

**Node.js → Deno**
Requires adapter shims for `ioredis`, `bullmq`, `minio` (not Deno-native). The domain logic in `modules/` is pure TypeScript and is fully portable.

**Fastify → Hono (edge runtime)**
Replace `src/index.ts` and `src/api/index.ts`. All `modules/` and `infrastructure/` code is framework-independent and reusable.

### Moving to a different database

Prisma supports: PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB, SQL Server.

To switch from PostgreSQL to PlanetScale (MySQL):
```prisma
// prisma/schema.prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"   // PlanetScale: no foreign key constraints
}
```
Then:
```bash
npm run db:generate   # regenerate client
npm run db:push       # push schema
```
All service code in `modules/` stays unchanged (Prisma abstracts the DB dialect).

### Deploying without Docker

The app has no hard Docker dependency. To deploy on a bare VM or managed services:

```bash
# Install deps
npm ci --production

# Set environment variables (see .env.example)
export DATABASE_URL="postgresql://..."
export REDIS_HOST="your-redis-host"
# etc.

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start
node dist/index.js &
node dist/worker/index.js &
```

**Managed services mapping:**

| Self-hosted (Docker) | Managed cloud equivalent |
|---|---|
| PostgreSQL container | AWS RDS / Supabase / Neon |
| Redis container | AWS ElastiCache / Upstash |
| MinIO container | AWS S3 / Cloudflare R2 |
| Prometheus + Grafana | AWS CloudWatch / Datadog |
| Loki + Promtail | AWS CloudWatch Logs / Logtail |

---

## 10. Open-Source Contribution Guide

### Setting up locally

```bash
# 1. Clone
git clone <repo-url>
cd execora

# 2. Install dependencies
npm install

# 3. Copy env
cp .env.example .env
# Fill in at minimum: DATABASE_URL, REDIS_HOST, OPENAI_API_KEY

# 4. Start infrastructure
docker compose up postgres redis minio -d

# 5. Set up database
npm run db:generate
npm run db:push
npm run seed

# 6. Start dev server
npm run dev
```

### Running tests

```bash
npm test          # build + run all tests
./run-tests.sh    # same, with colored output
```

### Where to add new business features

**Adding a new domain (e.g., "Inventory Alerts")**:
1. Create `src/modules/inventory-alert/inventory-alert.service.ts`
2. Add Prisma model to `prisma/schema.prisma`
3. Add routes to `src/api/index.ts`
4. Add voice intent handler in `src/modules/voice/engine.ts`
5. Add response templates in `src/modules/voice/response-template.ts`

**Adding a new STT provider**:
1. Create `src/integrations/stt/<provider>.ts`
2. Export it from `src/integrations/stt/index.ts`
3. No other changes needed

**Adding a new API route**:
1. Add to `src/api/index.ts`
2. Do NOT add try/catch — the global error handler covers it
3. Use `reply.code(404).send(...)` for explicit 404s

### Code conventions

| Convention | Rule |
|---|---|
| Errors | Throw from services, catch at route/worker boundary |
| Logging | Always use `logger` from `infrastructure/logger`, never `console.*` |
| Database | Use `prisma` from `infrastructure/database` — never create new PrismaClient |
| Types | All shared types in `src/types.ts` |
| Config | All env vars in `src/config.ts` — never read `process.env` directly elsewhere |
| Tests | All tests in `src/__tests__/*.test.ts` |
| Imports | Use relative paths, never path aliases (simpler for contributors) |

### Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` | Yes | Redis hostname |
| `REDIS_PORT` | No (6379) | Redis port |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DEEPGRAM_API_KEY` | Yes (audio mode) | Deepgram API key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key (TTS) |
| `WHATSAPP_API_TOKEN` | No | WhatsApp Business API token |
| `MINIO_ENDPOINT` | No (minio) | MinIO hostname |
| `MINIO_PORT` | No (9000) | MinIO port |
| `MINIO_ACCESS_KEY` | No | MinIO access key |
| `MINIO_SECRET_KEY` | No | MinIO secret key |
| `PORT` | No (3000) | Server port |
| `NODE_ENV` | No (development) | `development` or `production` |
| `USE_ENHANCED_AUDIO` | No (true) | `false` to use basic text-only WS handler |
| `TZ` | No (Asia/Kolkata) | Timezone for reminder scheduling |

---

*Last updated: 2026-02-20 — reflects complete restructuring from layer-based to module-based architecture, error handling audit, Docker/monitoring fixes, and future migration planning.*
