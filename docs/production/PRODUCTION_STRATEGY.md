# Production Strategy — Senior Engineering Playbook

> How we restructured safely, how to roll back, and how to operate Execora at production grade.

---

## Table of Contents

1. [The Strategy We Followed](#1-the-strategy-we-followed)
2. [Rollback — 4 Levels of Recovery](#2-rollback--4-levels-of-recovery)
3. [Deployment Strategies — 5 Patterns](#3-deployment-strategies--5-patterns)
4. [Real-Time Production Concerns](#4-real-time-production-concerns)
5. [Current Code Issues to Fix Before Production](#5-current-code-issues-to-fix-before-production)
6. [Observability Checklist](#6-observability-checklist)
7. [Database Migration Safety](#7-database-migration-safety)
8. [Senior Engineer Mental Models](#8-senior-engineer-mental-models)

---

## 1. The Strategy We Followed

### The core principle: never take big-bang risk

We moved 34 files across 6 folders. A naive engineer would do this:

```bash
# WRONG — big-bang, untestable
mv src/business/ src/modules/
mv src/services/ src/integrations/
mv src/lib/ src/infrastructure/
npm run build  # pray it works
```

We did this instead:

```
One file → update its imports → npm run build → verify clean → next file
```

Every single move was a **tested checkpoint**. If any build failed, we had lost at most one file of work, not everything.

### The three safety properties we maintained throughout

| Property | How we maintained it |
|---|---|
| **Zero data schema changes** | We only moved TypeScript files. Prisma schema never changed. The database was untouched. |
| **Build must pass after every file** | `npm run build` after each move. Never accumulated broken state. |
| **One direction at a time** | Moved infrastructure first (no business logic deps), then business modules (depend on infrastructure), then integrations, then API/WS layer. |

### Dependency order (why we went infrastructure → modules → integrations → api)

```
infrastructure/  ← no deps on anything in src/
    ↑
modules/         ← depends on infrastructure/
    ↑
integrations/    ← depends on modules/ + infrastructure/
    ↑
ws/ + api/       ← depends on everything above
    ↑
index.ts         ← depends on everything
```

Moving in this order meant each file's imports always already pointed to files that existed in their new location.

### What we did before starting

```bash
# Created a full filesystem backup
cp -r execora execora-backup-20260220-012445
```

This is not a substitute for git — it is a **last-resort recovery mechanism** if git state gets corrupted or if we need to diff line-by-line without git blame.

---

## 2. Rollback — 4 Levels of Recovery

A senior engineer always has rollback plans at multiple granularities. Here are all four for Execora:

---

### Level 1 — Git rollback (seconds, zero data loss)

This is always the first option. Git is the source of truth.

```bash
# See the commit log — find the last good state
git log --oneline

# Option A: Reset to a specific commit (destructive — loses uncommitted work)
git reset --hard <commit-hash>

# Option B: Revert a specific commit (safe — creates a new commit)
git revert <commit-hash>

# Option C: Check out old file from history (surgical)
git checkout <commit-hash> -- src/lib/logger.ts

# Option D: Stash current work, go back, try again
git stash
git reset --hard <commit-hash>
```

**When to use:** Any mistake made after the last commit. This covers ~99% of cases.

**What it does NOT affect:** Database, Redis state, Docker volumes.

---

### Level 2 — Filesystem backup rollback (minutes)

```bash
# Full restore from backup
rm -rf src/ package.json tsconfig.json
cp -r execora-backup-20260220-012445/src ./
cp execora-backup-20260220-012445/package.json ./
cp execora-backup-20260220-012445/tsconfig.json ./

# Verify build
npm run build
```

**When to use:** Git history is compromised, or you need to recover something that was never committed (e.g., a file that existed in the old structure but was deleted before commit).

**What it does NOT affect:** Database, Redis state, Docker volumes, node_modules.

---

### Level 3 — Docker image rollback (zero downtime, ~30 seconds)

This is the **production rollback** when a bad version has been deployed.

The prerequisite is **tagged Docker images**. Our current Dockerfiles produce untagged `latest` images — this must be fixed before production:

```bash
# CURRENT (dangerous — can't roll back)
docker compose build
docker compose up -d

# CORRECT — tag every build with git commit hash
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t execora-app:${GIT_SHA} -f Dockerfile .
docker build -t execora-worker:${GIT_SHA} -f Dockerfile.worker .

# Deploy new version
docker service update --image execora-app:${GIT_SHA} execora_app

# Something wrong? Roll back to previous tag in seconds
docker service update --image execora-app:${PREV_SHA} execora_app
```

**Production docker-compose with versioned images:**

```yaml
# docker-compose.prod.yml
services:
  app:
    image: execora-app:${GIT_SHA}   # GIT_SHA from CI/CD env var
    ...
  worker:
    image: execora-worker:${GIT_SHA}
    ...
```

```bash
# Deploy
GIT_SHA=a1b2c3d docker compose -f docker-compose.prod.yml up -d

# Instant rollback — just change the SHA
GIT_SHA=9f8e7d6 docker compose -f docker-compose.prod.yml up -d
```

**When to use:** Live production bug discovered after deployment.

**What it does NOT affect:** Database, Redis queue state, MinIO files.

---

### Level 4 — Blue-Green environment rollback (true zero downtime)

Run two identical production environments (Blue = current, Green = new). Traffic switches via load balancer.

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  (Nginx/Caddy)  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼──────────┐
    │    BLUE (live)    │       │    GREEN (new)       │
    │  execora-app:old  │       │  execora-app:new     │
    │  execora-worker   │       │  execora-worker      │
    └───────────────────┘       └─────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │  ← shared
                    │   Redis         │  ← shared
                    │   MinIO         │  ← shared
                    └─────────────────┘
```

**Deployment flow:**
```bash
# 1. Green is deployed and health-checked
# 2. Load balancer switches 100% traffic from Blue → Green
# 3. Blue stays running for 5-10 minutes (rollback window)
# 4. If Green has issues, flip back instantly — zero downtime
# 5. If Green is stable, tear down Blue
```

**Rollback:** Change one Nginx upstream line → reload. Nginx reload takes <1 second.

---

## 3. Deployment Strategies — 5 Patterns

### Pattern 1 — Rolling Update (default for Execora Docker Compose)

Update containers one at a time. Old containers drain connections before stopping.

```bash
# Current: both containers replaced at once (risky)
docker compose up -d --build

# Better: rolling with stop-grace-period
docker compose up -d --no-deps --scale app=2 app
# Wait for new instance to pass health check
docker compose up -d --scale app=1 app  # remove old
```

**Suitable for:** API servers. Not suitable for workers with long-running jobs.

---

### Pattern 2 — Canary Release

Route 5–10% of traffic to the new version, monitor for errors, then gradually increase.

```nginx
# nginx.conf upstream with weights
upstream execora_backend {
    server blue:3000 weight=90;   # 90% old
    server green:3000 weight=10;  # 10% new (canary)
}
```

**When to increase weight:** Error rate and P99 latency on Green match Blue.

**When to abort:** Error rate on Green exceeds old version by >1% or P99 spikes >50%.

---

### Pattern 3 — Feature Flags

Toggle new behaviour without code deployment. Execora already has one:

```typescript
// src/index.ts — already exists
const useEnhancedAudio = process.env.USE_ENHANCED_AUDIO !== 'false';
```

This is a feature flag. The pattern extends to any risky new feature:

```typescript
// Pattern: env-var feature flag with safe default
const FEATURE_NEW_INVOICE_ENGINE = process.env.FEATURE_NEW_INVOICE_ENGINE === 'true';

if (FEATURE_NEW_INVOICE_ENGINE) {
  return await newInvoiceService.create(data);
} else {
  return await legacyInvoiceService.create(data);
}
```

**Enable for 10% of requests** (hash-based):
```typescript
const useNew = parseInt(customerId.slice(-1), 16) < 2; // ~12.5% of customers
```

**Suitable for:** Code path changes that affect business logic. Not suitable for DB schema changes.

---

### Pattern 4 — Strangler Fig (how to restructure without downtime)

Instead of a big-bang rewrite, wrap old code in new interfaces and gradually replace internals.

**This is exactly what we did:**

```typescript
// Old: src/lib/minio.ts (deleted)
// New: src/infrastructure/storage.ts (same API, new location)

// The callers never changed their interface — they call the same methods
// We only changed the import path, not the contract
```

For larger changes:

```typescript
// Step 1: Create the new implementation alongside old
// src/modules/invoice/invoice-v2.service.ts

// Step 2: Route a small % of traffic to it
const service = FEATURE_INVOICE_V2 ? invoiceV2Service : invoiceService;

// Step 3: When v2 is stable and tested, delete v1 and remove the flag
```

---

### Pattern 5 — Branch by Abstraction

When you need to replace a deep dependency (e.g., swap Deepgram for Whisper in production):

```typescript
// Step 1: Define the interface
interface STTProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
  createLiveConnection(onTranscript, onError): Promise<LiveConnection>;
}

// Step 2: Both providers implement the interface
class DeepgramSTT implements STTProvider { ... }
class WhisperSTT implements STTProvider { ... }

// Step 3: Inject via factory (selectable at runtime)
const stt: STTProvider = config.sttProvider === 'whisper' ? new WhisperSTT() : new DeepgramSTT();

// Step 4: In production, set STT_PROVIDER=whisper and roll out
// Step 5: Remove DeepgramSTT when Whisper is fully stable
```

Execora's `integrations/stt/index.ts` already follows this pattern.

---

## 4. Real-Time Production Concerns

These are the concerns that separate senior engineers from junior engineers. Real-time apps (WebSocket + BullMQ) have non-obvious failure modes.

### 4.1 WebSocket connection draining

**Problem:** When you restart `execora-app`, all WebSocket clients are abruptly disconnected. The voice conversation stops mid-word. This is visible to users.

**Current state:** Our graceful shutdown closes Fastify (which closes the WebSocket server) but does not wait for active voice sessions to finish.

**Fix — drain WebSocket before shutdown:**

```typescript
// src/ws/enhanced-handler.ts — track active sessions
const activeSessions = new Set<string>();

// src/index.ts — drain before closing
async function shutdown() {
  logger.info('Waiting for active voice sessions to complete...');

  // Stop accepting new WebSocket connections
  fastify.server.close();

  // Wait up to 30 seconds for active sessions to end naturally
  const deadline = Date.now() + 30_000;
  while (activeSessions.size > 0 && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
  }

  if (activeSessions.size > 0) {
    logger.warn({ count: activeSessions.size }, 'Forcefully closing remaining sessions');
    // Close remaining sessions with a clean message
  }

  await fastify.close();
  await disconnectDB();
  await closeQueues();
  process.exit(0);
}
```

**Docker Compose setting:**
```yaml
services:
  app:
    stop_grace_period: 35s  # allow drain window + buffer
```

---

### 4.2 BullMQ worker drain — never lose in-flight jobs

**Problem:** If the worker process is killed while processing a job (e.g., mid-WhatsApp-send), BullMQ may re-queue the job causing a duplicate send.

**Current state:** Our workers close on SIGTERM but do not wait for the active job to finish.

**Fix — drain in-flight jobs before shutdown:**

```typescript
// src/worker/index.ts — already has SIGTERM handler, needs drain
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — draining workers');

  // Stop accepting new jobs
  await reminderWorker.pause(true);  // 'true' = pause globally
  await whatsappWorker.pause(true);

  // Wait for current jobs to finish (up to 30s)
  await reminderWorker.close(30_000);
  await whatsappWorker.close(30_000);

  process.exit(0);
});
```

**Docker Compose:**
```yaml
services:
  worker:
    stop_grace_period: 40s   # must be > the job close timeout
```

**BullMQ retry is already configured** — if a job fails due to process kill, BullMQ automatically re-queues it (up to `attempts` limit). This protects against crashes, but drain prevents the unnecessary re-queue.

---

### 4.3 Database migration race condition

**Current problem in Dockerfile:**

```dockerfile
# DANGEROUS in multi-instance deployment
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

If you deploy 3 instances simultaneously, all 3 run `migrate deploy` at startup. While Prisma uses a distributed lock, this adds ~5 seconds of startup delay per instance and can fail under high load.

**Fix — migrations as a separate step:**

```yaml
# docker-compose.prod.yml
services:
  migrate:
    image: execora-app:${GIT_SHA}
    command: npx prisma migrate deploy
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"          # run once and exit

  app:
    image: execora-app:${GIT_SHA}
    command: node dist/index.js   # no migration
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
```

In CI/CD pipelines:
```bash
# Step 1: Run migrations (one instance, one time)
docker run --rm execora-app:${GIT_SHA} npx prisma migrate deploy

# Step 2: Deploy app instances
docker compose up -d app worker
```

---

### 4.4 Health check — liveness vs readiness

**Current state:** `GET /health` returns `{ status: "ok" }` immediately. It does not check if the DB, Redis, or MinIO are actually reachable.

**Two types of health checks (Kubernetes/Docker distinction):**

| Check | Fails → | Purpose |
|---|---|---|
| **Liveness** | Restart the container | Is the process alive? |
| **Readiness** | Remove from load balancer | Can the instance serve traffic? |

**Fix — split into two endpoints:**

```typescript
// Liveness — is the process running? Never checks external deps
fastify.get('/health/live', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Readiness — can this instance serve traffic?
fastify.get('/health/ready', async (request, reply) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,           // DB reachable
    redisConnection.ping(),               // Redis reachable
    minioClient.fileExists('_healthcheck'), // MinIO reachable
  ]);

  const failed = checks.filter(c => c.status === 'rejected');
  if (failed.length > 0) {
    return reply.code(503).send({ status: 'not-ready', failed: failed.length });
  }

  return { status: 'ready' };
});
```

```yaml
# docker-compose.yml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 15s
```

---

### 4.5 Redis outage — queue resilience

**Problem:** If Redis goes down, BullMQ jobs cannot be queued. Reminder scheduling fails.

**Current behaviour:** `reminderQueue.add()` throws → caught by our error handler → reminder marked FAILED. This is correct, but the merchant loses the reminder.

**Production-grade fix — retry queue or dead-letter:**

```typescript
// Option 1: Retry queue add with exponential backoff
async function addToQueue(queue: Queue, name: string, data: any, opts: any) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await queue.add(name, data, opts);
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, attempt * 1000));  // 1s, 2s
    }
  }
}

// Option 2: Fall back to polling — store reminder in DB with SCHEDULED status
// A separate cron job reads SCHEDULED reminders and enqueues any that are
// within the next 5 minutes but not in BullMQ
```

---

### 4.6 Circuit breaker for external APIs

**Problem:** If Deepgram or ElevenLabs is slow or down, every WebSocket connection hangs waiting.

**Pattern — circuit breaker:**

```typescript
// State machine: CLOSED (normal) → OPEN (failing fast) → HALF_OPEN (testing)
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextRetry = 0;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextRetry) {
        throw new Error('Circuit breaker OPEN — service degraded');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {  // 5 consecutive failures
      this.state = 'OPEN';
      this.nextRetry = Date.now() + 30_000;  // 30s cooldown
      logger.error('Circuit breaker OPENED');
    }
  }
}

// Usage in integrations/stt/deepgram.ts
const deepgramCircuit = new CircuitBreaker();

async function transcribe(audio: Buffer) {
  return deepgramCircuit.call(() => deepgramClient.transcribe(audio));
}
```

**Degraded-mode fallback:**
```typescript
// If STT circuit is OPEN, fall back to text-only mode
// Notify the client instead of silently hanging
ws.send(JSON.stringify({
  type: 'error',
  data: { message: 'Voice recognition temporarily unavailable. Please type your command.' }
}));
```

---

## 5. Current Code Issues to Fix Before Production

These are gaps found in the codebase that must be addressed before going to production at scale.

### Critical (must fix)

| Issue | Location | Fix |
|---|---|---|
| Docker image has no version tag | `Dockerfile`, CI pipeline | Tag every build: `execora-app:${GIT_SHA}` |
| Migrations run inside app container | `Dockerfile` CMD | Separate migrate step (see 4.3) |
| No readiness health check | `src/api/index.ts` | Add `/health/ready` checking DB+Redis+MinIO |
| No WebSocket drain on shutdown | `src/index.ts` | Wait for active sessions before `fastify.close()` |
| `stop_grace_period` not set | `docker-compose.yml` | Add `stop_grace_period: 35s` to app+worker |

### Important (fix before scaling to multiple instances)

| Issue | Location | Fix |
|---|---|---|
| No Docker image registry | CI/CD | Push images to registry (GHCR, ECR, Docker Hub) |
| No rate limiting | `src/api/index.ts` | Add `@fastify/rate-limit` plugin |
| WhatsApp webhook has no signature verification | `src/api/index.ts` | Verify `X-Hub-Signature-256` header from Meta |
| No request timeout on Fastify | `src/index.ts` | Set `connectionTimeout: 10000` on Fastify instance |
| No Redis password in production | `docker-compose.yml` | Add `requirepass` to Redis command |

### Nice to have

| Issue | Fix |
|---|---|
| Pino logs to file only (not stdout in prod) | Add stdout transport in production for Docker log aggregation |
| No correlation ID for request tracing | Add `X-Request-ID` header, include in all log entries |
| No distributed tracing | Instrument with OpenTelemetry |

---

## 6. Observability Checklist

What a senior engineer monitors before declaring production stable:

### The Four Golden Signals (Google SRE)

| Signal | Metric | Alert threshold |
|---|---|---|
| **Latency** | `http_request_duration_seconds` P99 | > 2000ms for 5 min |
| **Traffic** | `http_requests_total` rate | Drop to 0 for 2 min |
| **Errors** | `http_requests_total{status_code=~"5.."}` | > 1% of all requests |
| **Saturation** | Node Exporter CPU/memory | > 85% for 10 min |

### Business metrics to add to `src/infrastructure/metrics.ts`

```typescript
// Currently missing — these matter for Execora
export const wsActiveConnections = new Gauge({
  name: 'ws_active_connections',
  help: 'Currently active WebSocket voice sessions',
});

export const queueDepth = new Gauge({
  name: 'bullmq_queue_depth',
  help: 'Jobs waiting in BullMQ',
  labelNames: ['queue'],
});

export const remindersSent = new Counter({
  name: 'reminders_sent_total',
  help: 'WhatsApp reminders successfully delivered',
});

export const sttLatency = new Histogram({
  name: 'stt_duration_seconds',
  help: 'Deepgram STT response time',
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});
```

### Log lines every production incident needs

All are already structured JSON in Pino — make sure these fields exist:

```json
// Every request (Fastify auto-logs)
{ "level": "info", "method": "POST", "url": "/api/v1/invoices", "statusCode": 200, "responseTime": 45 }

// Every voice session start
{ "level": "info", "sessionId": "ws-abc", "sttProvider": "deepgram", "msg": "WebSocket handler registered" }

// Every invoice/payment (business event)
{ "level": "info", "invoiceId": "...", "customerId": "...", "total": 101, "msg": "Invoice created successfully" }

// Every worker job
{ "level": "info", "jobId": "reminder-abc", "reminderId": "...", "msg": "Reminder sent successfully" }

// Every error (structured, not just a message)
{ "level": "error", "error": { "message": "...", "stack": "..." }, "url": "/api/v1/invoices", "msg": "Request error" }
```

---

## 7. Database Migration Safety

### Rules for zero-downtime schema changes

The rule: **every migration must be backward-compatible with the running code**.

This means splitting changes into two deployments:

**Phase 1 — Expand (backward-compatible):**
```sql
-- SAFE: add a nullable column (old code ignores it, new code uses it)
ALTER TABLE customers ADD COLUMN gstin VARCHAR(15);

-- SAFE: add a new table (old code doesn't know about it)
CREATE TABLE customer_tags (...);

-- SAFE: add an index (no downtime, built in background)
CREATE INDEX CONCURRENTLY idx_customers_gstin ON customers(gstin);
```

**Phase 2 — Contract (after all instances are on new code):**
```sql
-- SAFE: remove a column that no code references anymore
ALTER TABLE customers DROP COLUMN old_field;

-- SAFE: rename a column after adding a new one and migrating data
ALTER TABLE customers DROP COLUMN nick;  -- old code removed, data migrated
```

**Never do in a single migration:**
```sql
-- DANGEROUS: rename column in one step (old code breaks instantly)
ALTER TABLE customers RENAME COLUMN nickname TO alias;

-- DANGEROUS: add NOT NULL without a default (fails on existing rows)
ALTER TABLE customers ADD COLUMN gstin VARCHAR(15) NOT NULL;

-- DANGEROUS: drop a column that running code still reads
ALTER TABLE reminders DROP COLUMN retryCount;
```

### Prisma migration for Execora

```bash
# Development: push schema changes
npm run db:push

# Staging/Production: create and apply a migration file
npm run db:migrate -- --name add_customer_gstin

# Deploy migration to production (run before new app code)
npx prisma migrate deploy
```

---

## 8. Senior Engineer Mental Models

### "What happens if this line throws?"

For every external call (DB, Redis, MinIO, Deepgram, OpenAI, WhatsApp), ask:
1. Is it wrapped in try/catch?
2. Does the catch re-throw (correct) or swallow (incorrect)?
3. If it re-throws, who handles it? (Fastify global handler, BullMQ retry, or process crash)
4. Is the user notified, or do they see a silent hang?

### "What happens if we deploy two instances?"

For every stateful piece, ask:
1. **In-memory state** — if two API instances run, each has its own memory. Customer caches are not shared. Is this a problem? (For Execora: minor, cache miss just hits DB)
2. **BullMQ jobs** — are safe. Workers compete for jobs from the same Redis queue. This is by design.
3. **Migrations** — run once, not once per instance (see 4.3).

### "What happens if the process is killed mid-operation?"

| Operation | Mid-kill behaviour | Recovery |
|---|---|---|
| Prisma transaction | PostgreSQL rolls back automatically (ACID) | Safe |
| BullMQ job | Job returns to queue, retried (up to `attempts`) | Safe |
| File upload to MinIO | Partial file in MinIO | Need cleanup job for orphaned uploads |
| WebSocket voice session | Client disconnects | Client should reconnect automatically |

### "What is the blast radius?"

Before any change, estimate:
- **Narrow:** Only affects one customer, one request, one job
- **Wide:** Affects all customers (e.g., DB migration, Redis flush, Fastify plugin crash)
- **Total:** Takes down the whole service (e.g., process crash on startup)

Wide and total changes always need:
- A rollback plan at the infrastructure level (not just git)
- Tested in staging first
- Deployed off-peak hours
- Monitored for 30 minutes post-deploy before declaring success

### "Why module-based > layer-based in production"

Layer-based structure optimises for **how code is written** (all controllers together, all services together).

Module-based structure optimises for **how incidents are investigated**:
- Alert fires: "Invoice creation failed"
- Engineer opens `src/modules/invoice/` — all relevant code in one place
- No cross-folder hunting required

In production, time-to-debug is the most important metric after time-to-detect.

---

## Summary: The Hierarchy of Production Safety

```
1. PREVENT  — Good architecture, type safety, tests, error handling
2. DETECT   — Observability: logs, metrics, alerts
3. CONTAIN  — Feature flags, circuit breakers, rate limiting
4. RECOVER  — Rollback: git → image tag → blue-green
5. LEARN    — Post-incident review: update runbooks, add test cases
```

All five layers are required. Any gap becomes a production incident.

---

*Last updated: 2026-02-20 — reflects Execora v1.0.0 module-based structure.*
