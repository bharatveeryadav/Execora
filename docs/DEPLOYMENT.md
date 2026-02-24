# Execora — Deployment & Setup Guide

**Production-ready deployment using Docker Compose**

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start (Docker Compose)](#3-quick-start-docker-compose)
4. [Environment Configuration](#4-environment-configuration)
5. [Service Details](#5-service-details)
6. [Database Setup & Migrations](#6-database-setup--migrations)
7. [Product Catalog Seeding](#7-product-catalog-seeding)
8. [MinIO Bucket Setup](#8-minio-bucket-setup)
9. [Local Development (Without Docker)](#9-local-development-without-docker)
10. [Build & Image Details](#10-build--image-details)
11. [Health Checks & Monitoring](#11-health-checks--monitoring)
12. [Scaling & Multi-Instance](#12-scaling--multi-instance)
13. [Logs](#13-logs)
14. [Troubleshooting](#14-troubleshooting)
15. [npm Scripts Reference](#15-npm-scripts-reference)

---

## 1. Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Network: execora-network              │
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  execora-app │   │execora-worker│   │   execora-postgres  │  │
│  │  (port 3000) │   │(background   │   │    (port 5432)      │  │
│  │  API + WS    │   │ jobs only)   │   │    PostgreSQL 15     │  │
│  └──────┬───────┘   └──────┬───────┘   └─────────────────────┘  │
│         │                  │                                       │
│         └──────────────────┼──────────────────────┐              │
│                            │                       │              │
│  ┌──────────────┐   ┌──────▼───────┐   ┌──────────▼──────────┐  │
│  │execora-minio │   │ execora-redis│   │   execora-pgadmin   │  │
│  │  (port 9000) │   │  (port 6379) │   │    (port 5050)      │  │
│  │  (port 9001) │   │  Redis 7     │   │    pgAdmin 4        │  │
│  │  Object Store│   │  BullMQ +    │   └─────────────────────┘  │
│  └──────────────┘   │  Conv Memory │   ┌─────────────────────┐  │
│                      └──────────────┘   │  execora-adminer    │  │
│                                         │    (port 8081)      │  │
│                                         └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Ports Exposed to Host

| Service | Host Port | Purpose |
|---|---|---|
| `execora-app` | `3000` | API + WebSocket voice channel |
| `execora-postgres` | `5432` | PostgreSQL (dev access) |
| `execora-redis` | `6379` | Redis (dev access) |
| `execora-minio` | `9000` | MinIO S3 API |
| `execora-minio` | `9001` | MinIO Web Console |
| `execora-pgadmin` | `5050` | pgAdmin 4 Web UI |
| `execora-adminer` | `8081` | Adminer (lightweight DB UI) |

---

## 2. Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (plugin) | `docker compose version` |
| Node.js (dev only) | 20 LTS | `node --version` |
| npm (dev only) | 9+ | `npm --version` |

---

## 3. Quick Start (Docker Compose)

### Step 1 — Clone and configure

```bash
git clone <repo-url>
cd execora

# Copy example env and fill in your API keys
cp .env.email.example .env
```

### Step 2 — Edit `.env`

At minimum, set these before starting:

```env
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=dg_...           # or ELEVENLABS_API_KEY
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my-secret-token
```

Full configuration: see [Section 4](#4-environment-configuration).

### Step 3 — Start all services

```bash
docker compose up -d
```

This starts in order (respecting `depends_on` + health checks):
1. `postgres` → wait healthy
2. `redis` → wait healthy
3. `minio` → wait healthy
4. `app` → runs `prisma migrate deploy` then starts API
5. `worker` → starts BullMQ job processor
6. `pgadmin` + `adminer` → DB UIs

### Step 4 — Seed product catalog (first time only)

```bash
docker compose exec app npx ts-node prisma/seed.ts
# OR if dist is built:
docker compose exec app node -e "require('./dist/prisma/seed')"
```

Or run seed locally pointing at the container DB:

```bash
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora npx tsx prisma/seed.ts
```

### Step 5 — Verify

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# { "status": "ok", "db": "connected", "redis": "connected" }
```

---

## 4. Environment Configuration

Create `.env` in the project root. All values below are read by both `app` and `worker` containers via `env_file: .env`.

> **Note:** `DATABASE_URL`, `REDIS_HOST`, `MINIO_ENDPOINT` etc. are overridden per-container inside `docker-compose.yml` to use Docker service hostnames. Your `.env` values are used for local development only.

### Minimal `.env`

```env
# ── Required API Keys ──────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-...

# Speech-to-Text (pick one)
DEEPGRAM_API_KEY=dg_...
# OR
ELEVENLABS_API_KEY=...
STT_PROVIDER=deepgram          # deepgram | elevenlabs

# TTS (pick one)
TTS_PROVIDER=elevenlabs        # elevenlabs | openai
ELEVENLABS_API_KEY=...         # (same key as STT if using ElevenLabs)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# WhatsApp Business
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=EAAx...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my-random-secret

# ── Email (for invoice delivery + OTP) ────────────────────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # Gmail App Password
EMAIL_FROM="My Shop <you@gmail.com>"

# ── Shop Identity ──────────────────────────────────────────────────
SHOP_NAME=My Kirana Store
BUSINESS_NAME=My Kirana Store

# ── Defaults (override if needed) ─────────────────────────────────
NODE_ENV=production
TZ=Asia/Kolkata
CONV_TTL_HOURS=4
```

### Full `.env` Reference

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
TZ=Asia/Kolkata
ALLOWED_ORIGINS=*

# Database (overridden in docker-compose for container)
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora?schema=public
DB_SLOW_QUERY_MS=500

# Redis (overridden in docker-compose for container)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CONV_TTL_HOURS=4

# MinIO (overridden in docker-compose for container)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=execora
MINIO_USE_SSL=false

# OpenAI
OPENAI_API_KEY=sk-...

# STT
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=dg_...
ELEVENLABS_API_KEY=...
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_STT_LANGUAGE=hi

# TTS
TTS_PROVIDER=elevenlabs
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
WHATSAPP_API_VERSION=v18.0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASSWORD=...
EMAIL_FROM="My Shop <noreply@shop.com>"

# Shop / Tenant
SHOP_NAME=My Kirana Store
BUSINESS_NAME=My Kirana Store
SYSTEM_TENANT_ID=system-tenant-001
SYSTEM_USER_ID=system-user-001
ADMIN_EMAIL=admin@store.local
ADMIN_PASSWORD_HASH=changeme
ADMIN_NAME=Admin

# Audio
USE_ENHANCED_AUDIO=true
```

---

## 5. Service Details

### `execora-app` (API Server)

```yaml
build: Dockerfile          # Multi-stage Node 20 build
CMD: prisma migrate deploy && node dist/index.js
port: 3000
volumes:
  - ./logs:/app/logs       # Structured JSON logs persisted to host
```

**Startup sequence inside container:**
1. `prisma migrate deploy` — applies any pending DB migrations
2. `node dist/index.js` — starts Fastify server with WebSocket

**Entry point:** `src/index.ts`

### `execora-worker` (Background Jobs)

```yaml
build: Dockerfile.worker   # Separate multi-stage build
CMD: node dist/worker/index.js
# No port — internal only
```

Processes three BullMQ queues:
- `reminders` — payment reminders via WhatsApp
- `whatsapp` — outbound WhatsApp messages
- `media` — audio/video processing

**Entry point:** `src/worker/index.ts`

> Worker is intentionally separated so it can be scaled independently of the API server.

### `execora-postgres`

```yaml
image: postgres:15-alpine
credentials: execora / execora / execora   # user / password / db
volume: postgres_data (named Docker volume)
healthcheck: pg_isready -U execora
```

### `execora-redis`

```yaml
image: redis:7-alpine
volume: redis_data
healthcheck: redis-cli ping
```

Used for:
- Conversation memory (`conv:{id}:mem`)
- Shop-level invoice draft (`shop:{tenantId}:pending_invoice`)
- BullMQ job queues
- Runtime config polling

### `execora-minio`

```yaml
image: minio/minio:latest
ports: 9000 (API), 9001 (console)
credentials: minioadmin / minioadmin
volume: minio_data
```

Console URL: `http://localhost:9001`
Login: `minioadmin` / `minioadmin`

---

## 6. Database Setup & Migrations

### On First Deploy (Automated)

The `app` container runs `prisma migrate deploy` on startup, which:
1. Creates all tables defined in `prisma/schema.prisma`
2. Applies any pending migrations from `prisma/migrations/`
3. Runs `bootstrap.ts` on app start — creates default Tenant + User if missing

### Manual Migration Commands

```bash
# Apply migrations to container DB
docker compose exec app npx prisma migrate deploy

# Open Prisma Studio (from host, pointing at container DB)
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora npx prisma studio

# Push schema changes without migration (dev only)
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora npx prisma db push

# Generate Prisma client after schema change
npx prisma generate
```

### DB UI Access

| Tool | URL | Login |
|---|---|---|
| pgAdmin 4 | `http://localhost:5050` | `admin@admin.com` / `admin` |
| Adminer | `http://localhost:8081` | system: PostgreSQL, server: postgres, user: execora, pass: execora |

---

## 7. Product Catalog Seeding

Seeds **88 kirana products** with HSN codes and GST rates.

```bash
# Via Docker exec (recommended after first deploy):
docker compose exec app npm run seed

# Locally against running container:
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora npm run seed

# What it does:
# - Creates all products if they don't exist
# - Updates HSN code + GST rate on existing products (re-runnable/idempotent)
# - Removes placeholder auto-created ₹0 products from testing
# - Does NOT touch customers, invoices, or ledger data
```

**Re-running seed is safe** — it upserts existing products by name.

---

## 8. MinIO Bucket Setup

The MinIO bucket `execora` must exist before invoice PDFs can be uploaded.

### Auto-Setup (Recommended)

Add to your startup script or run once:

```bash
# Install MinIO client
docker run --rm --network execora-network \
  minio/mc alias set local http://minio:9000 minioadmin minioadmin

# Create bucket
docker run --rm --network execora-network \
  minio/mc mb local/execora --ignore-existing

# Set public download policy (for presigned URLs to work)
docker run --rm --network execora-network \
  minio/mc anonymous set download local/execora
```

### Via MinIO Console

1. Open `http://localhost:9001`
2. Login: `minioadmin` / `minioadmin`
3. **Buckets → Create Bucket** → name: `execora`
4. Set access policy to `public` if you want presigned URLs to be accessible

---

## 9. Local Development (Without Docker)

You still need Postgres + Redis + MinIO running. Easiest: start only infra services:

```bash
# Start only infrastructure (no app/worker containers)
docker compose up -d postgres redis minio pgadmin

# Install Node dependencies
npm install

# Push DB schema (first time)
DATABASE_URL=postgresql://execora:execora@localhost:5432/execora npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed products
npm run seed

# Start API server (hot-reload)
npm run dev

# Start worker (separate terminal)
npm run worker
```

### Development Scripts

```bash
npm run dev          # tsx watch — hot-reload API server
npm run worker       # tsx worker — hot-reload background worker
npm run build        # tsc — compile TypeScript to dist/
npm run start        # node dist/index.js — run compiled server
npm run start:worker # node dist/worker/index.js — run compiled worker
npm run db:studio    # Prisma Studio GUI
npm run db:migrate   # Create new migration
npm run db:push      # Push schema without migration (dev only)
npm run seed         # Run product catalog seed
npm run test         # Build + run tests
```

---

## 10. Build & Image Details

### `Dockerfile` (API Server)

```
Stage 1 — builder (node:20-bullseye-slim):
  apt install openssl          ← Prisma requirement
  npm install                  ← all deps
  npx prisma generate          ← generate Prisma client
  npm run build                ← tsc → dist/

Stage 2 — production (node:20-bullseye-slim):
  npm install --omit=dev       ← prod deps only
  COPY dist/                   ← compiled JS
  COPY .prisma/                ← generated client
  mkdir /app/logs
  CMD: prisma migrate deploy && node dist/index.js
```

### `Dockerfile.worker` (Worker)

Identical build stages but:
```
CMD: node dist/worker/index.js
# No prisma migrate (app container handles migrations)
# No logs volume needed
```

### Rebuilding After Code Changes

```bash
# Rebuild and restart app only
docker compose build app && docker compose up -d app

# Rebuild and restart worker only
docker compose build worker && docker compose up -d worker

# Full rebuild
docker compose build && docker compose up -d
```

---

## 11. Health Checks & Monitoring

### Built-in Health Endpoint

```bash
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "timestamp": "2025-02-24T10:00:00.000Z"
}
```

### Metrics Endpoint

```bash
GET http://localhost:3000/metrics
```

Returns application-level metrics: request counts, queue depths, response times.

### Docker Health Checks

All services have Docker health checks configured:

| Service | Check Command | Interval | Retries |
|---|---|---|---|
| postgres | `pg_isready -U execora` | 5s | 3 |
| redis | `redis-cli ping` | 5s | 3 |
| minio | `curl -f localhost:9000/minio/health/live` | 5s | 3 |

```bash
# Check all container health statuses
docker compose ps

# Watch logs
docker compose logs -f app
docker compose logs -f worker
```

### Redis Queue Monitoring

```bash
# Connect to Redis container
docker compose exec redis redis-cli

# Check BullMQ queue sizes
LLEN bull:reminders:wait
LLEN bull:whatsapp:wait
LLEN bull:media:wait
```

---

## 12. Scaling & Multi-Instance

### API Server Scaling

The API server is **stateless** (all session state is in Redis), so multiple instances can run behind a load balancer:

```bash
docker compose up -d --scale app=3
```

> WebSocket connections require sticky sessions at the load balancer level (route by `sessionId` cookie or header).

### Worker Scaling

Workers are also stateless — scale freely:

```bash
docker compose up -d --scale worker=5
```

BullMQ handles distributed job locking automatically.

### Redis Conversation TTL

Conversations expire after `CONV_TTL_HOURS` (default 4h). Each write refreshes the TTL. Increase for longer business days:

```env
CONV_TTL_HOURS=8
```

---

## 13. Logs

### Log Format

Structured JSON (pino) written to stdout and `/app/logs/`:

```json
{
  "level": 30,
  "time": 1706789012345,
  "msg": "Executing intent",
  "intent": "CREATE_INVOICE",
  "entities": { "customer": "Rahul", "items": [...] },
  "conversationId": "ws-1706789012345-abc"
}
```

### Log Levels

| Level | When |
|---|---|
| `info` | Normal operations (intent executed, invoice created) |
| `warn` | Recoverable issues (customer not found, cache miss) |
| `error` | Failures (DB error, PDF upload failed, email failed) |
| `debug` | Verbose (PDF generated, Redis write) |

### Accessing Logs

```bash
# Live tail
docker compose logs -f app

# Log files on host (from volume mount)
tail -f ./logs/app.log

# Worker logs
docker compose logs -f worker
```

---

## 14. Troubleshooting

### App fails to start — DB not ready

```
Error: Can't reach database server
```

**Fix:** Wait for postgres health check to pass, or increase `start_period` in `docker-compose.yml`.

```bash
docker compose logs postgres
docker compose restart app
```

### Prisma client not generated

```
Error: @prisma/client did not initialize yet
```

**Fix:**
```bash
docker compose exec app npx prisma generate
docker compose restart app
```

### MinIO bucket missing — PDF upload fails

```
Error: The specified bucket does not exist
```

**Fix:** Create the `execora` bucket (see [Section 8](#8-minio-bucket-setup)).

### Redis connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

In Docker: ensure `REDIS_HOST=redis` (not `localhost`) — this is handled by `docker-compose.yml` override automatically.

```bash
docker compose exec redis redis-cli ping
# Should return: PONG
```

### OpenAI rate limit

```
Error: 429 Too Many Requests
```

The LLM cache (`src/infrastructure/llm-cache.ts`) deduplicates repeated identical requests. For sustained high volume, upgrade OpenAI tier or add request queuing.

### Email not sending — Gmail

1. Enable **2-Factor Authentication** on Gmail
2. Generate an **App Password** (Google Account → Security → App Passwords)
3. Use the 16-character App Password as `EMAIL_PASSWORD`, not your Gmail password

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # 16-char app password
```

### PDF not generating — pdfkit error

```
Error: Cannot find module 'pdfkit'
```

```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

### TypeScript build fails

```bash
npx tsc --noEmit    # check errors without building
npm run build       # full build
```

---

## 15. npm Scripts Reference

| Script | Command | Use |
|---|---|---|
| `npm run dev` | `tsx watch src/index.ts` | Hot-reload dev server |
| `npm run worker` | `tsx src/worker/index.ts` | Hot-reload worker |
| `npm run build` | `tsc` | Compile TypeScript |
| `npm run start` | `node dist/index.js` | Run compiled server |
| `npm run start:worker` | `node dist/worker/index.js` | Run compiled worker |
| `npm run seed` | `tsx prisma/seed.ts` | Seed product catalog |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:push` | `prisma db push` | Push schema (dev, no migration) |
| `npm run db:migrate` | `prisma migrate dev` | Create + apply migration |
| `npm run migrate:prod` | `prisma migrate deploy` | Apply migrations (production) |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio GUI |
| `npm run test` | `build + node --test` | Run test suite |

---

## Production Checklist

Before going live:

- [ ] All required API keys set in `.env`
- [ ] `NODE_ENV=production`
- [ ] Strong `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (not a guessable value)
- [ ] MinIO `execora` bucket created
- [ ] Product catalog seeded (`npm run seed`)
- [ ] Email delivery tested (send a test invoice)
- [ ] WebSocket connection tested from client
- [ ] `GET /health` returns `"status": "ok"`
- [ ] Log volume mounted (`./logs:/app/logs`)
- [ ] DB backups configured for `postgres_data` volume
- [ ] Redis persistence enabled (`appendonly yes` in redis config for AOF)
- [ ] `CONV_TTL_HOURS` set to match your business day length
- [ ] `SHOP_NAME` and `BUSINESS_NAME` set to your shop name

---

*Execora Deployment Guide — v1.0*
