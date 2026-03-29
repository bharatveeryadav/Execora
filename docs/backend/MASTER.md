# Backend Master

**Owner:** Backend team  
**Last updated:** March 2026  
**Key source files:**

- `apps/api/src/api/index.ts` — route registration (23 route files)
- `apps/api/src/api/routes/` — all REST handlers
- `apps/api/src/ws/enhanced-handler.ts` — WebSocket events (default)
- `apps/api/src/ws/handler.ts` — original WS handler (fallback)
- `packages/modules/src/modules/` — business services
- `packages/infrastructure/src/` — DB, Redis, queue, auth, metrics
- `prisma/schema.prisma` — data model (28 models)

---

## Purpose

Single consolidated backend reference for current runtime behavior.

## Stack

| Component      | Technology                                                             | Notes                         |
| -------------- | ---------------------------------------------------------------------- | ----------------------------- |
| API Runtime    | Fastify (`@execora/api`)                                               | Port 3006                     |
| WebSocket      | `@fastify/websocket` on `/ws`                                          | JWT via query token           |
| Queue          | BullMQ — `reminderQueue`, `whatsappQueue`, `mediaQueue`, `ocrJobQueue` | Redis-backed                  |
| Database       | PostgreSQL via Prisma ORM                                              | 28 models                     |
| Cache          | Redis (`@execora/infrastructure` → `redis-client.ts`)                  |                               |
| Storage        | MinIO (`storage.ts`)                                                   | Object storage for PDFs/media |
| Observability  | Prometheus metrics + structured JSON logs                              | `metrics.ts`, `logger.ts`     |
| Email          | `email.ts`                                                             | SMTP via nodemailer           |
| WhatsApp       | `whatsapp.ts`                                                          | Outbound messaging            |
| Feature Flags  | `feature-flags.ts`                                                     | Runtime toggle per tenant     |
| Tenant Context | `tenant-context.ts`                                                    | AsyncLocalStorage per request |

**WebSocket toggle:** set `USE_ENHANCED_AUDIO=false` to fall back to the original `handler.ts`. Default is enhanced.

---

## Auth & Access Control

| Scope            | Auth                     | Header / Token                |
| ---------------- | ------------------------ | ----------------------------- |
| Public           | None                     | —                             |
| Business (JWT)   | `requireAuth` preHandler | `Authorization: Bearer <jwt>` |
| Admin (platform) | `adminAuthPreHandler`    | `x-admin-api-key: <key>`      |

**Public routes (no JWT):**

- `POST /api/v1/auth/login|refresh|logout|hash`
- `POST /webhooks/*`
- `GET /pub/invoice/:id/:token`
- `GET /api/v1/demo-invoices|purchases|quotations`
- `GET /health`

**Middleware files** (`apps/api/src/api/middleware/`):

- `require-auth.ts` — JWT verification, sets tenant context
- `admin-auth.ts` — `x-admin-api-key` check
- `require-role.ts` — Role-based access (owner > admin > manager > staff > viewer)
- `require-feature.ts` — Feature flag gate

---

## API Routes (23 route files)

All registered in `apps/api/src/api/index.ts`:

| Route file                 | Prefix                    | Auth                 |
| -------------------------- | ------------------------- | -------------------- |
| `auth.routes.ts`           | `/api/v1/auth`            | Public               |
| `webhook.routes.ts`        | `/webhooks`               | Public               |
| `portal.routes.ts`         | `/pub/invoice/:id/:token` | Public (token-based) |
| `demo.routes.ts`           | `/api/v1/demo-*`          | Public               |
| `customer.routes.ts`       | `/api/v1/customers`       | JWT                  |
| `product.routes.ts`        | `/api/v1/products`        | JWT                  |
| `invoice.routes.ts`        | `/api/v1/invoices`        | JWT                  |
| `ledger.routes.ts`         | `/api/v1/ledger`          | JWT                  |
| `reminder.routes.ts`       | `/api/v1/reminders`       | JWT                  |
| `session.routes.ts`        | `/api/v1/sessions`        | JWT                  |
| `summary.routes.ts`        | `/api/v1/summary`         | JWT                  |
| `report.routes.ts`         | `/api/v1/reports`         | JWT                  |
| `expense.routes.ts`        | `/api/v1/expenses`        | JWT                  |
| `credit-note.routes.ts`    | `/api/v1/credit-notes`    | JWT                  |
| `draft.routes.ts`          | `/api/v1/drafts`          | JWT                  |
| `supplier.routes.ts`       | `/api/v1/suppliers`       | JWT                  |
| `purchase-order.routes.ts` | `/api/v1/purchase-orders` | JWT                  |
| `monitoring.routes.ts`     | `/api/v1/monitoring`      | JWT                  |
| `ai.routes.ts`             | `/api/v1/ai`              | JWT                  |
| `feedback.routes.ts`       | `/api/v1/feedback`        | JWT                  |
| `push.routes.ts`           | `/api/v1/push`            | JWT                  |
| `users.routes.ts`          | `/api/v1/users`           | JWT                  |
| `admin.routes.ts`          | `/admin`                  | `x-admin-api-key`    |
| BullMQ Board               | `/admin/queues`           | `x-admin-api-key`    |

---

## Business Modules (`packages/modules/src/modules/`)

| Module        | Key exports                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `customer/`   | `customerService`                                                                                |
| `product/`    | `productService`                                                                                 |
| `invoice/`    | `invoiceService` — `createInvoice`, `previewInvoice`, `generateInvoiceNo`, `findOrCreateProduct` |
| `ledger/`     | `ledgerService`                                                                                  |
| `reminder/`   | `reminderService`                                                                                |
| `gst/`        | `gstService`, `gstr1Service` — CGST/SGST/IGST calc, GSTR-1 B2B/B2CL/B2CS                         |
| `monitoring/` | `monitoringService`                                                                              |
| `ai/`         | `aiService`                                                                                      |
| `voice/`      | `conversation`, `engine`, `sessionService`, `taskQueue`, `responseTemplate`                      |

**Also exported:** LLM/STT/TTS providers (`providers/`), Devanagari utils (`utils/devanagari`).

---

## Infrastructure Services (`packages/infrastructure/src/`)

| File                | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `config.ts`         | Env-based config (`DATABASE_URL`, `REDIS_URL`, etc.)                          |
| `database.ts`       | Prisma client (`prisma`)                                                      |
| `redis-client.ts`   | Redis client (`redisClient`, `checkRedisHealth`)                              |
| `queue.ts`          | BullMQ queues — `reminderQueue`, `whatsappQueue`, `mediaQueue`, `ocrJobQueue` |
| `storage.ts`        | MinIO client (`minioClient`)                                                  |
| `auth.ts`           | JWT sign/verify (`verifyAccessToken`, `signAccessToken`)                      |
| `email.ts`          | Email dispatch (`emailService`)                                               |
| `whatsapp.ts`       | WhatsApp outbound (`whatsappService`)                                         |
| `pdf.ts`            | Invoice PDF generation (`generateInvoicePdf`)                                 |
| `logger.ts`         | Pino structured logger (`logger`)                                             |
| `metrics.ts`        | Prometheus counters/histograms                                                |
| `metrics-plugin.ts` | Fastify plugin — exposes `/metrics`                                           |
| `tenant-context.ts` | AsyncLocalStorage tenant/user context (`tenantContext`)                       |
| `runtime-config.ts` | DB-backed runtime config (`getRuntimeConfig`, polling)                        |
| `feature-flags.ts`  | Feature flag evaluation per tenant                                            |
| `portal-token.ts`   | Public invoice portal token generation                                        |
| `fuzzy-match.ts`    | Fuzzy product name matching                                                   |
| `llm-cache.ts`      | LLM response cache (Redis-backed)                                             |
| `reminder-ops.ts`   | Reminder scheduling logic                                                     |
| `bootstrap.ts`      | System bootstrap (`bootstrapSystem`)                                          |
| `workers.ts`        | In-process BullMQ workers (`startWorkers`, `closeWorkers`)                    |
| `error-handler.ts`  | `AppError`, `ErrorHandler`, `setupGlobalErrorHandlers`                        |

---

## Prisma Models (28)

**Core business:** `Tenant`, `User`, `Session`, `Customer`, `CustomerAlias`, `CustomerRelationship`, `CustomerCommunicationPrefs`

**Products & Stock:** `Product`, `ProductVariant`, `ProductBatch`, `SerialNumber`, `StockMovement`

**Billing:** `Invoice`, `InvoiceItem`, `Payment`, `InvoiceCounter`, `CreditNote`, `CreditNoteItem`, `Draft`

**Procurement:** `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`

**Finance:** `Expense`

**Messaging / Comms:** `MessageTemplate`, `WhatsappTemplate`, `EmailTemplate`, `SmsTemplate`, `Reminder`, `ScheduledMessage`, `MessageLog`

**Voice / AI:** `ConversationSession`, `SessionActiveContext`, `ConversationTurn`, `UserConversationQueue`, `CustomerContextCache`, `ConversationFlow`, `VoiceRecording`

**Ops / Audit:** `ActivityLog`, `WebhookEvent`, `GstReminder`, `GstAudit`, `OcrJob`, `MonitoringEvent`, `MonitoringConfig`

**Misc:** `Feedback`, `PushDevice`

---

## Build & Run

```bash
pnpm dev           # API in watch mode (port 3006)
pnpm worker        # Worker in watch mode
pnpm build         # Turbo build all packages
pnpm typecheck     # TypeScript check
pnpm db:generate   # Prisma generate
pnpm db:push       # Apply schema to DB
```

Docker:

```bash
pnpm docker:up
pnpm docker:db:push
pnpm docker:seed
pnpm docker:logs
```

---

## Domain Subfolders

| Subfolder                      | Key docs                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| [billing/](billing/)           | GST system, invoice requirements, compliance audit, QR/barcode |
| [inventory/](inventory/)       | Inventory sprint plan, stock research                          |
| [auth/](auth/)                 | JWT flows, role middleware                                     |
| [api/](api/)                   | OpenAPI spec, REST API reference                               |
| [architecture/](architecture/) | System architecture                                            |

---

## Related Docs

- [../web/MASTER.md](../web/MASTER.md) — web frontend
- [../mobile/MASTER.md](../mobile/MASTER.md) — mobile app
- [../infra/MASTER.md](../infra/MASTER.md) — infra, Docker, monitoring
- [../../TASKS_COMPLETED.md](../../TASKS_COMPLETED.md) — completed work log
- [../../TASKS_PENDING.md](../../TASKS_PENDING.md) — active backlog
- [../../DOCS_FLOW.md](../../DOCS_FLOW.md) — governance rules
