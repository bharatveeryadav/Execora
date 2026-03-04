# Execora — Agent Coding Standards & Production Engineering Guide

> **READ THIS FILE BEFORE WRITING A SINGLE LINE OF CODE.**
> Every agent (AI or human) working on this codebase must follow every rule in this document.
> Rules are not suggestions. Production systems fail silently when these rules are ignored.

---

## Table of Contents

1. [Rule Zero — The Three Questions](#1-rule-zero--the-three-questions)
2. [Project Structure — Layer Laws](#2-project-structure--layer-laws)
3. [Error Handling — The Contract](#3-error-handling--the-contract)
4. [Structured Logging — Every Log Must Be Useful](#4-structured-logging--every-log-must-be-useful)
5. [Metrics & Monitoring — Prometheus Instrumentation](#5-metrics--monitoring--prometheus-instrumentation)
6. [Distributed Tracing — Request Correlation](#6-distributed-tracing--request-correlation)
7. [TypeScript Standards — No Escape Hatches](#7-typescript-standards--no-escape-hatches)
8. [API Route Anatomy — The Only Acceptable Pattern](#8-api-route-anatomy--the-only-acceptable-pattern)
9. [Service Layer Standards](#9-service-layer-standards)
10. [Database — Prisma Rules](#10-database--prisma-rules)
11. [React Component Standards](#11-react-component-standards)
12. [BullMQ Worker Standards](#12-bullmq-worker-standards)
13. [WebSocket Event Standards](#13-websocket-event-standards)
14. [Debugging Runbook — Trace Any Bug in 5 Steps](#14-debugging-runbook--trace-any-bug-in-5-steps)
15. [Production PR Checklist — Ship Nothing Without This](#15-production-pr-checklist--ship-nothing-without-this)

---

## 1. Rule Zero — The Three Questions

Before writing any code, answer these three questions:

```
Q1: What exact user problem does this code solve?
    → Must map to a real use case in docs/PRODUCT_REQUIREMENTS.md §3.
    → If you cannot name the use case, stop and re-read the PRD.

Q2: Which layer does this code belong to?
    → Service (business logic) / Route (HTTP adapter) / UI (React) / Worker (async job)
    → NEVER mix layers. A route must not contain business logic.
    → NEVER call prisma directly from a route — always go through a service.

Q3: If this code throws, crashes, or produces bad data — how will I know in production?
    → Every function that can fail must: catch, log with context, emit a metric, return a typed error.
    → "Silent failure" is the most dangerous outcome. Always fail loudly.
```

---

## 2. Project Structure — Layer Laws

```
execora/
├── packages/
│   ├── infrastructure/src/         ← Shared singletons: prisma, logger, redis, queue, metrics
│   │   ├── logger.ts               ← THE logger. Import from here. Nowhere else.
│   │   ├── metrics.ts              ← Prometheus registry. Import from here.
│   │   ├── database.ts             ← PrismaClient singleton
│   │   ├── queue.ts                ← BullMQ queue factory
│   │   └── workers.ts              ← All BullMQ worker processors
│   │
│   └── modules/src/modules/        ← ALL business logic lives here
│       ├── invoice/invoice.service.ts
│       ├── customer/customer.service.ts
│       ├── product/product.service.ts
│       └── voice/engine/           ← Intent routing + handlers
│
├── apps/
│   ├── api/src/api/routes/         ← Thin HTTP adapters ONLY — no business logic
│   │   ├── invoice.routes.ts
│   │   ├── draft.routes.ts
│   │   └── ...
│   │
│   └── web/src/
│       ├── pages/                  ← Page-level components (route entry points)
│       ├── components/             ← Shared UI components
│       ├── hooks/                  ← React Query hooks + custom hooks
│       └── lib/api.ts              ← All API client calls — only file that calls fetch()
```

### Layer Laws (never violate)

| From    | To                    | Allowed?                               |
| ------- | --------------------- | -------------------------------------- |
| Route   | Service               | ✅ Only way business logic is accessed |
| Route   | Prisma                | ❌ Never. Always via service.          |
| Service | Prisma                | ✅                                     |
| Service | Another service       | ✅ OK for orchestration                |
| Worker  | Service               | ✅ Workers call services               |
| Worker  | Prisma                | ❌ Never directly                      |
| UI      | REST API (via api.ts) | ✅                                     |
| UI      | Prisma                | ❌ Never                               |
| UI      | Service               | ❌ Never                               |

---

## 3. Error Handling — The Contract

### 3.1 — Typed Application Errors

Every service must throw typed errors, not raw `new Error('string')`:

```typescript
// packages/infrastructure/src/errors.ts
export class AppError extends Error {
	constructor(
		public readonly code: string, // e.g. 'PRODUCT_NOT_FOUND'
		public readonly message: string,
		public readonly statusCode: number = 500,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string, id: string) {
		super('NOT_FOUND', `${resource} not found: ${id}`, 404, { resource, id });
	}
}

export class ValidationError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super('VALIDATION_ERROR', message, 400, context);
	}
}

export class TenantAccessError extends AppError {
	constructor(resource: string) {
		super('FORBIDDEN', `Access denied to ${resource}`, 403, { resource });
	}
}
```

### 3.2 — Service layer error pattern

```typescript
// ✅ CORRECT — every service function
async function getProduct(tenantId: string, productId: string): Promise<Product> {
	const product = await prisma.product.findFirst({
		where: { id: productId, tenantId, isActive: true },
	});

	if (!product) {
		// Typed error with full context for debugging
		throw new NotFoundError('Product', productId);
	}

	return product;
}

// ❌ WRONG — generic error, no context
async function getProduct(tenantId: string, productId: string) {
	const product = await prisma.product.findFirst({ where: { id: productId } });
	if (!product) throw new Error('not found'); // useless in production logs
	return product;
}
```

### 3.3 — Route layer error handler

```typescript
// ✅ CORRECT — Fastify route with full error handling
fastify.get('/api/v1/products/:id', async (request, reply) => {
	try {
		const { tenantId } = request.user; // always extract tenantId first
		const { id } = request.params as { id: string };

		const product = await productService.getProduct(tenantId, id);
		return reply.send({ product });
	} catch (err) {
		// AppError: structured, known error → return to client
		if (err instanceof AppError) {
			request.log.warn({ err, tenantId: request.user?.tenantId }, 'product.get.appError');
			return reply.status(err.statusCode).send({ error: err.code, message: err.message });
		}

		// Unknown error: log FULL details, return generic 500
		request.log.error(
			{ err, route: 'GET /products/:id', tenantId: request.user?.tenantId },
			'product.get.unexpectedError'
		);
		return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
	}
});
```

### 3.4 — Worker / async error pattern

```typescript
// ✅ Workers must NEVER silently swallow errors
processor.on('failed', (job, err) => {
	logger.error(
		{
			jobId: job?.id,
			jobName: job?.name,
			tenantId: job?.data?.tenantId,
			attempt: job?.attemptsMade,
			err,
		},
		'worker.job.failed'
	);
	// emit metric (see §5)
	metrics.workerJobFailed.inc({ job_name: job?.name ?? 'unknown' });
});
```

---

## 4. Structured Logging — Every Log Must Be Useful

### 4.1 — Import only from infrastructure

```typescript
// ✅ ALWAYS import logger from infrastructure
import { logger } from '@execora/infrastructure';

// ❌ NEVER use console.log / console.error in production code
console.log('done'); // invisible in Docker log aggregation
console.error(err); // no context, no tenant, no searchability
```

### 4.2 — Log levels — use the right one

| Level          | When                                      | Example                     |
| -------------- | ----------------------------------------- | --------------------------- |
| `logger.trace` | Very verbose, dev-only (disabled in prod) | Loop iterations             |
| `logger.debug` | Useful during development                 | "Found 3 matching products" |
| `logger.info`  | Normal operations — a record was created  | "invoice.created"           |
| `logger.warn`  | Expected failure — wrong input, auth fail | "product.notFound"          |
| `logger.error` | Unexpected failure — should never happen  | "db.queryFailed"            |
| `logger.fatal` | System is going down                      | "redis.connectionLost"      |

### 4.3 — Always log with a context object + event key

```typescript
// ✅ CORRECT — structured, searchable, traceable
logger.info(
	{
		tenantId,
		invoiceId: invoice.id,
		customerId: invoice.customerId,
		total: invoice.total,
		durationMs: Date.now() - startTime,
	},
	'invoice.confirmed' // ← event key: module.entity.action
);

// ❌ WRONG — unstructured string, impossible to search in Grafana
logger.info(`Invoice ${invoice.id} confirmed for tenant ${tenantId}`);
```

### 4.4 — Log event key convention

```
Format: <module>.<entity>.<action>

Examples:
  invoice.created
  invoice.confirmed
  invoice.confirm.failed
  product.stock.low
  product.ocr.extracted
  draft.confirmed
  draft.confirm.failed
  reminder.scheduled
  reminder.sent
  customer.resolved
  worker.ocr.started
  worker.ocr.completed
  worker.ocr.failed
  auth.login.success
  auth.login.failed
  auth.token.refreshed
```

### 4.5 — Always include tenantId in every log

```typescript
// Every log in a multi-tenant context MUST include tenantId
// Without it, you cannot filter one tenant's logs in production

logger.error({ tenantId, err, productId }, 'product.save.failed');
//             ^^^^^^^^ always first field
```

### 4.6 — Measure duration for every external call

```typescript
// ✅ CORRECT — every DB call, HTTP call, Redis call, LLM call must be timed
const t0 = Date.now();
const result = await openai.chat.completions.create({ ... });
logger.info(
  { tenantId, model: 'gpt-4o', durationMs: Date.now() - t0, tokensUsed: result.usage?.total_tokens },
  'llm.completion.done'
);

// ❌ WRONG — no timing = no performance visibility in production
const result = await openai.chat.completions.create({ ... });
```

---

## 5. Metrics & Monitoring — Prometheus Instrumentation

### 5.1 — Import registry from infrastructure

```typescript
import { metrics } from '@execora/infrastructure';
// metrics exports the Prometheus registry + all registered metrics
```

### 5.2 — Register metrics at module load, NOT inside functions

```typescript
// ✅ CORRECT — registered once at top of file
import { Counter, Histogram } from 'prom-client';
import { metricsRegistry } from '@execora/infrastructure';

const invoiceConfirmCounter = new Counter({
  name: 'execora_invoices_confirmed_total',
  help: 'Total invoices confirmed',
  labelNames: ['tenant_id'],
  registers: [metricsRegistry],
});

const invoiceConfirmDuration = new Histogram({
  name: 'execora_invoice_confirm_duration_seconds',
  help: 'Invoice confirmation duration in seconds',
  labelNames: ['tenant_id', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

// ❌ WRONG — registering inside a function on every call
async function confirmInvoice() {
  const counter = new Counter({ name: 'invoices_total', ... }); // duplicated on every call!
}
```

### 5.3 — Metric naming conventions

```
Format: execora_<subsystem>_<metric_name>_<unit>

Counters (always end with _total):
  execora_invoices_confirmed_total
  execora_invoices_created_total
  execora_drafts_confirmed_total
  execora_drafts_discarded_total
  execora_api_errors_total
  execora_worker_jobs_failed_total
  execora_llm_requests_total
  execora_whatsapp_sent_total
  execora_whatsapp_failed_total

Histograms (latency, always _seconds or _bytes):
  execora_api_request_duration_seconds
  execora_llm_response_duration_seconds
  execora_db_query_duration_seconds
  execora_pdf_generation_duration_seconds
  execora_ocr_extraction_duration_seconds

Gauges (current state):
  execora_pending_drafts_count
  execora_queue_depth
  execora_active_tenants
```

### 5.4 — Instrument every P0 / P1 feature

Every feature that matters to the business (see PRD §11) MUST have at minimum:

- A success counter
- An error counter
- A duration histogram

```typescript
// Example: OCR worker instrumentation
const ocrJobTotal = new Counter({
	name: 'execora_ocr_jobs_total',
	help: 'Total OCR jobs processed',
	labelNames: ['status'], // status: 'success' | 'failed' | 'empty'
	registers: [metricsRegistry],
});

const ocrDuration = new Histogram({
	name: 'execora_ocr_duration_seconds',
	help: 'OCR job end-to-end duration',
	buckets: [0.5, 1, 2, 5, 10, 30],
	registers: [metricsRegistry],
});

// Usage:
const end = ocrDuration.startTimer();
try {
	await processOcrJob(job);
	ocrJobTotal.inc({ status: 'success' });
} catch (err) {
	ocrJobTotal.inc({ status: 'failed' });
	throw err;
} finally {
	end(); // always record duration, even on failure
}
```

---

## 6. Distributed Tracing — Request Correlation

### 6.1 — Every request gets a correlation ID

```typescript
// Fastify plugin (already in infrastructure/src/bootstrap.ts)
// Every request must have request.id propagated to all logs, services, jobs

// ✅ In every route handler:
const correlationId = request.id; // Fastify auto-generates, or read from X-Request-ID header

logger.info({ tenantId, correlationId, invoiceId }, 'invoice.confirm.start');

// ✅ When enqueuing a BullMQ job, carry the correlationId:
await queue.add('ocr-process', {
	tenantId,
	correlationId, // ← pass through so worker logs are traceable
	imageUrl,
	jobType: 'product_catalog',
});
```

### 6.2 — Worker logs must carry correlationId

```typescript
// ✅ In every worker processor:
const processor = async (job: Job) => {
	const { tenantId, correlationId } = job.data;

	const log = logger.child({ tenantId, correlationId, jobId: job.id, jobName: job.name });
	// From here, use `log` (not the root logger) so all logs have the job context

	log.info('worker.job.started');
	try {
		// ... do work ...
		log.info({ durationMs }, 'worker.job.completed');
	} catch (err) {
		log.error({ err }, 'worker.job.failed');
		throw err; // rethrow so BullMQ marks it failed and retries
	}
};
```

### 6.3 — Frontend → API correlation

```typescript
// lib/api.ts — pass a correlation ID on every request
const correlationId = crypto.randomUUID();

const headers = {
	Authorization: `Bearer ${token}`,
	'X-Request-ID': correlationId, // ← Fastify uses this as request.id
	'Content-Type': 'application/json',
};
```

---

## 7. TypeScript Standards — No Escape Hatches

### 7.1 — Forbidden patterns

```typescript
// ❌ FORBIDDEN — all of these will be rejected in code review
const data: any = ...              // use unknown + type guard instead
JSON.parse(raw) as SomeType        // use zod.parse() for external data
(obj as any).field                 // fix the type instead
// @ts-ignore                      // fix the type instead
// @ts-expect-error                // only acceptable in test files with comment

// ❌ FORBIDDEN — non-null assertion on anything that CAN be null
const user = map.get(id)!          // check explicitly instead
```

### 7.2 — External data must go through Zod

```typescript
// ✅ Every API route body, query param, and external JSON must be parsed with Zod
import { z } from 'zod';

const CreateDraftSchema = z.object({
	type: z.enum(['product', 'purchase', 'expense', 'stock_adjustment']),
	title: z.string().min(1).max(255).optional(),
	data: z.record(z.unknown()),
	notes: z.string().max(1000).optional(),
});

// In route:
const body = CreateDraftSchema.safeParse(request.body);
if (!body.success) {
	return reply.status(400).send({
		error: 'VALIDATION_ERROR',
		message: 'Invalid request body',
		details: body.error.flatten(),
	});
}
// body.data is now fully typed
```

### 7.3 — Return types must be explicit on all service functions

```typescript
// ✅ Explicit return type — contract is clear, TypeScript catches regressions
async function confirmDraft(tenantId: string, draftId: string): Promise<{ draft: Draft; result: unknown }> {
	// ...
}

// ❌ Inferred return type on service boundary — breaks callers silently when implementation changes
async function confirmDraft(tenantId: string, draftId: string) {
	// ...
}
```

### 7.4 — Use discriminated unions for results

```typescript
// ✅ Rich result types — caller always handles both branches
type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

// Callers are forced to check:
const result = await invoiceService.confirm(tenantId, id);
if (!result.ok) {
	// handle error — TypeScript won't let you access result.data here
}
```

---

## 8. API Route Anatomy — The Only Acceptable Pattern

Every Fastify route must follow this exact structure:

```typescript
// apps/api/src/api/routes/example.routes.ts

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, NotFoundError } from '@execora/infrastructure';
import { exampleService } from '@execora/modules';

export async function exampleRoutes(fastify: FastifyInstance) {
	// ─── GET /api/v1/examples/:id ──────────────────────────────────────────
	fastify.get<{ Params: { id: string } }>(
		'/api/v1/examples/:id',
		{ preHandler: [fastify.authenticate] }, // ← auth always first
		async (request, reply) => {
			const t0 = Date.now();

			try {
				// 1. Extract identity
				const { tenantId, userId } = request.user;

				// 2. Validate params / query (Zod)
				const { id } = request.params;

				// 3. Call service — NEVER business logic here
				const item = await exampleService.getById(tenantId, id);

				// 4. Log success with timing
				request.log.info({ tenantId, id, durationMs: Date.now() - t0 }, 'example.get.success');

				// 5. Return
				return reply.send({ item });
			} catch (err) {
				// 6. Typed error → 4xx
				if (err instanceof AppError) {
					request.log.warn(
						{ err, tenantId: request.user?.tenantId, durationMs: Date.now() - t0 },
						'example.get.appError'
					);
					return reply.status(err.statusCode).send({
						error: err.code,
						message: err.message,
					});
				}

				// 7. Unknown error → 500, full log
				request.log.error(
					{ err, tenantId: request.user?.tenantId, durationMs: Date.now() - t0 },
					'example.get.unexpectedError'
				);
				return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
			}
		}
	);

	// ─── POST /api/v1/examples ─────────────────────────────────────────────
	fastify.post('/api/v1/examples', { preHandler: [fastify.authenticate] }, async (request, reply) => {
		const t0 = Date.now();

		// Validate body schema
		const BodySchema = z.object({
			name: z.string().min(1).max(255),
			value: z.number().positive(),
		});

		const parsed = BodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: 'VALIDATION_ERROR',
				message: 'Invalid body',
				details: parsed.error.flatten(),
			});
		}

		try {
			const { tenantId } = request.user;
			const item = await exampleService.create(tenantId, parsed.data);

			// Emit metric
			metrics.exampleCreatedTotal.inc({ tenant_id: tenantId });

			request.log.info({ tenantId, itemId: item.id, durationMs: Date.now() - t0 }, 'example.created');

			return reply.status(201).send({ item });
		} catch (err) {
			if (err instanceof AppError) {
				return reply.status(err.statusCode).send({ error: err.code, message: err.message });
			}
			request.log.error({ err, tenantId: request.user?.tenantId }, 'example.create.unexpectedError');
			return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
		}
	});
}
```

---

## 9. Service Layer Standards

```typescript
// packages/modules/src/modules/example/example.service.ts

import { prisma, logger } from '@execora/infrastructure';
import { NotFoundError, ValidationError } from '@execora/infrastructure';

export class ExampleService {
	// ── Every public method: explicit params, explicit return type ───────────
	async getById(tenantId: string, id: string): Promise<Example> {
		const row = await prisma.example.findFirst({
			where: { id, tenantId }, // ← tenantId ALWAYS in where clause
		});

		if (!row) throw new NotFoundError('Example', id);
		return row;
	}

	// ── Transactions: use prisma.$transaction for multi-step operations ──────
	async confirmAndUpdate(tenantId: string, id: string, updates: UpdatePayload): Promise<Example> {
		return prisma.$transaction(async (tx) => {
			const row = await tx.example.findFirst({ where: { id, tenantId } });
			if (!row) throw new NotFoundError('Example', id);

			const updated = await tx.example.update({
				where: { id },
				data: { ...updates, updatedAt: new Date() },
			});

			// Side effects inside the transaction (so they roll back on failure)
			await tx.auditLog.create({
				data: { tenantId, entityType: 'example', entityId: id, action: 'update' },
			});

			logger.info({ tenantId, id }, 'example.updated');
			return updated;
		});
	}
}

export const exampleService = new ExampleService();
```

---

## 10. Database — Prisma Rules

### 10.1 — tenantId is NEVER optional in queries

```typescript
// ✅ CORRECT
await prisma.product.findMany({
	where: { tenantId, isActive: true },
});

// ❌ CATASTROPHIC — returns data across ALL tenants
await prisma.product.findMany({
	where: { isActive: true },
});
```

### 10.2 — Always use findFirst when fetching by ID (not findUnique on compound fields)

```typescript
// ✅ Safe — even if id is somehow wrong tenant's, it returns null
const product = await prisma.product.findFirst({
	where: { id: productId, tenantId },
});

// ❌ Unsafe for multi-tenant — findUnique only checks the unique index (id)
const product = await prisma.product.findUnique({ where: { id: productId } });
```

### 10.3 — Soft deletes: always filter isActive

```typescript
// Products, customers use soft-delete pattern
where: { tenantId, isActive: true }
```

### 10.4 — Log slow queries

```typescript
// Warn if any query takes > 500ms
const t0 = Date.now();
const results = await prisma.invoice.findMany({ where: { tenantId, ...filters } });
const ms = Date.now() - t0;
if (ms > 500) {
	logger.warn({ tenantId, ms, query: 'invoice.findMany' }, 'db.slowQuery');
}
```

### 10.5 — Never use raw SQL unless absolutely necessary

```typescript
// ❌ Avoid unless justified
await prisma.$executeRaw`UPDATE products SET stock = ${stock} WHERE id = ${id}`;

// ✅ Use Prisma ORM
await prisma.product.update({ where: { id }, data: { stock } });
```

---

## 11. React Component Standards

### 11.1 — Component anatomy

```tsx
// apps/web/src/components/ExampleComponent.tsx

// ── 1. Imports: React → hooks → UI components → icons → types ──────────────
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';
import type { Product } from '@execora/types';

// ── 2. Types / constants first ─────────────────────────────────────────────
interface Props {
	tenantId: string;
	productId: string;
	onClose: () => void;
}

// ── 3. Component ───────────────────────────────────────────────────────────
export function ExampleComponent({ tenantId, productId, onClose }: Props) {
	const { toast } = useToast();
	const qc = useQueryClient();

	// ── Queries ──────────────────────────────────────────────────────────────
	const { data, isLoading, error } = useQuery({
		queryKey: ['product', productId],
		queryFn: () => productApi.get(productId),
		staleTime: 30_000,
	});

	// ── Mutations ─────────────────────────────────────────────────────────────
	const saveMutation = useMutation({
		mutationFn: (updates: Partial<Product>) => productApi.update(productId, updates),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products'] });
			toast({ title: 'Saved!', description: 'Product updated.' });
			onClose();
		},
		onError: (err: Error) => {
			toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
		},
	});

	// ── Loading / error states — always handle these ──────────────────────────
	if (isLoading)
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="animate-spin" />
			</div>
		);
	if (error) return <div className="text-destructive text-sm p-4">Failed to load: {(error as Error).message}</div>;
	if (!data) return null;

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<div>
			{/* JSX */}
			<Button onClick={() => saveMutation.mutate({})} disabled={saveMutation.isPending}>
				{saveMutation.isPending ? (
					<Loader2 className="h-4 w-4 animate-spin mr-2" />
				) : (
					<Save className="h-4 w-4 mr-2" />
				)}
				Save
			</Button>
		</div>
	);
}
```

### 11.2 — API calls: ONLY through lib/api.ts

```typescript
// ✅ CORRECT — all fetch() calls go through api.ts
import { productApi } from '@/lib/api';
const product = await productApi.get(id);

// ❌ WRONG — raw fetch in a component
const res = await fetch(`/api/v1/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
```

### 11.3 — React Query key conventions

```typescript
// Consistent key formats — always an array
['drafts'][('drafts', 'pending')][('draft', draftId)]['products'][('product', productId)][ // list of all drafts // filtered list // single item // list // single
	('invoices', { status: 'paid' })
]; // filtered list with options object
```

### 11.4 — Always show loading and error states

```tsx
// ✅ Every query-dependent component must have all three states
if (isLoading) return <Skeleton />;
if (error) return <ErrorBanner message={(error as Error).message} />;
if (!data?.items?.length) return <EmptyState />;
return <DataTable items={data.items} />;
```

### 11.5 — Never put business logic in components

```tsx
// ❌ WRONG — business logic in JSX
const discountedPrice = price - price * (discount / 100) - (price * gstRate) / 100;

// ✅ CORRECT — extract to a utility or use the service result
const { finalPrice } = useInvoiceTotals({ price, discount, gstRate });
```

---

## 12. BullMQ Worker Standards

```typescript
// packages/infrastructure/src/workers.ts

// ── Every worker processor must follow this template ──────────────────────

const processor = async (job: Job) => {
	const { tenantId, correlationId } = job.data;

	// 1. Create child logger with full job context
	const log = logger.child({
		tenantId,
		correlationId,
		jobId: job.id,
		jobName: job.name,
		attempt: job.attemptsMade + 1,
	});

	// 2. Start timing
	const t0 = Date.now();
	log.info({ data: job.data }, 'worker.job.started');

	// 3. Update job progress so BullMQ dashboard shows activity
	await job.updateProgress(10);

	try {
		// ─── actual work ───
		const result = await doActualWork(job.data);

		await job.updateProgress(100);

		// 4. Log success with timing
		log.info({ durationMs: Date.now() - t0, result }, 'worker.job.completed');

		// 5. Emit success metric
		metrics.workerJobTotal.inc({ job_name: job.name, status: 'success' });

		return result;
	} catch (err) {
		// 6. Log full error with context
		log.error({ err, durationMs: Date.now() - t0 }, 'worker.job.failed');

		// 7. Emit failure metric
		metrics.workerJobTotal.inc({ job_name: job.name, status: 'failed' });

		// 8. ALWAYS rethrow — so BullMQ knows the job failed and can retry
		throw err;
	}
};

// ── Retry configuration: every job queue must have retries ────────────────
const queue = new Queue('ocr-jobs', {
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: 'exponential', delay: 2000 },
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 50 },
	},
});
```

---

## 13. WebSocket Event Standards

### 13.1 — Every data mutation must broadcast a WS event

```typescript
// After any create/update/delete, broadcast immediately:
import { broadcaster } from '@execora/infrastructure';

// In route or service (after successful DB write):
broadcaster.toTenant(tenantId, {
	type: 'draft:created', // always: entity:action
	payload: {
		draftId: draft.id,
		type: draft.type,
		title: draft.title,
		count: pendingCount, // include counts for badge updates
	},
});
```

### 13.2 — Event type naming

```
Format: <entity>:<action>

Current events (WSContext.tsx):
  invoice:created       invoice:confirmed     invoice:updated
  invoice:cancelled     invoice:payment
  product:updated       product:stock
  customer:created      customer:updated
  ledger:payment:recorded
  expense:created       expense:deleted
  purchase:created      purchase:deleted
  reminder:created      reminder:cancelled
  draft:created         draft:confirmed       draft:discarded
```

### 13.3 — Frontend must handle the event in useWsInvalidation

```typescript
// apps/web/src/hooks/useWsInvalidation.ts
// Every new WS event type must be added to this map:
const EVENT_TO_QUERY_KEY: Record<string, string[]> = {
	'draft:created': ['drafts'],
	'draft:confirmed': ['drafts', 'products'],
	'draft:discarded': ['drafts'],
	// ... add new events here
};
```

---

## 14. Debugging Runbook — Trace Any Bug in 5 Steps

When something is broken in production, follow these steps in order:

### Step 1 — Find the request in Grafana / Loki

```bash
# Filter by tenant + event key
{app="execora-api"} | json | tenantId="your-tenant-id" | line_format "{{.msg}}"

# Filter by correlation ID (if you have it from frontend)
{app="execora-api"} | json | correlationId="abc-123"

# Find all errors in last 1h
{app="execora-api"} |= "error" | json | level="error"
```

### Step 2 — Find the exact failed log line

```bash
# Search for the event key that should have fired
{app="execora-api"} | json | msg="invoice.confirm.failed"
# → This gives you: tenantId, correlationId, err.message, err.code, durationMs
```

### Step 3 — Check Prometheus for metrics anomalies

```
# In Grafana, check:
execora_invoices_confirmed_total{tenant_id="X"} — did count stop incrementing?
execora_api_errors_total{route="/invoices/confirm"} — error rate up?
execora_db_query_duration_seconds — any p99 spikes?
```

### Step 4 — Check BullMQ (if async job involved)

```bash
# BullMQ dashboard in Bull-Board at /admin/queues
# OR via Redis CLI:
docker exec execora-redis redis-cli LRANGE "bull:ocr-jobs:failed" 0 10
```

### Step 5 — Reproduce locally

```bash
# Set log level to trace
LOG_LEVEL=trace docker compose up app

# Then replay the failing request — all intermediate steps will appear
```

---

## 15. Production PR Checklist — Ship Nothing Without This

Before submitting any PR that touches production code, verify ALL items:

### Code Quality

- [ ] No `any` types — use `unknown` + type guard or a proper type
- [ ] No `console.log` — use `logger.*` with an event key
- [ ] No raw `new Error('string')` — use typed `AppError` subclasses
- [ ] All service functions have explicit return types
- [ ] All external JSON input parsed with Zod
- [ ] `tenantId` included in every Prisma query `where` clause

### Error Handling

- [ ] All async functions have try/catch (or error middleware)
- [ ] All catch blocks log with context (tenantId, correlationId, err)
- [ ] Workers rethrow errors after logging (BullMQ retry requires this)
- [ ] 4xx errors return typed `{ error: CODE, message: string }` response
- [ ] 5xx errors log `err` object in full, return generic message to client

### Observability

- [ ] New feature has a `_total` counter metric
- [ ] DB / LLM / external calls are timed and duration is logged
- [ ] New WS event added to `useWsInvalidation.ts` map if applicable

### Data Safety

- [ ] Multi-step DB operations use `prisma.$transaction`
- [ ] `isActive: true` filter on soft-deletable models (products, customers)
- [ ] No raw SQL unless reviewed and justified

### React / Frontend

- [ ] All data fetches handle loading / error / empty states
- [ ] Mutations show loading spinner, disable button during inflight
- [ ] Error from mutation shown in toast with `variant: 'destructive'`
- [ ] React Query cache invalidated after successful mutation

### Documentation

- [ ] `docs/PRODUCT_REQUIREMENTS.md` §13 (Built section) updated if feature ships
- [ ] Event key added to §13 WS event list if new WS event added
- [ ] Sprint section updated if sprint milestone reached

---

## Appendix — Quick Reference Cheat Sheet

```typescript
// ─ Logger ─────────────────────────────────────────────────────────────────
import { logger } from '@execora/infrastructure';
logger.info({ tenantId, entityId, durationMs }, 'module.entity.action');
logger.warn({ tenantId, err }, 'module.entity.action.failed');
logger.error({ tenantId, err, correlationId }, 'module.entity.unexpectedError');

// ─ Metrics ────────────────────────────────────────────────────────────────
import { metricsRegistry } from '@execora/infrastructure';
const counter = new Counter({ name: 'execora_X_total', labelNames: ['tenant_id'], registers: [metricsRegistry] });
counter.inc({ tenant_id: tenantId });

const hist = new Histogram({ name: 'execora_X_duration_seconds', registers: [metricsRegistry] });
const end = hist.startTimer(); /* ... work ... */ end({ status: 'success' });

// ─ Errors ─────────────────────────────────────────────────────────────────
throw new NotFoundError('Product', productId);
throw new ValidationError('Price must be positive', { price });
throw new TenantAccessError('Invoice');

// ─ Zod validation ─────────────────────────────────────────────────────────
const result = Schema.safeParse(request.body);
if (!result.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.flatten() });

// ─ Database ───────────────────────────────────────────────────────────────
await prisma.product.findFirst({ where: { id, tenantId, isActive: true } });
await prisma.$transaction(async (tx) => { /* multi-step ops */ });

// ─ React Query ────────────────────────────────────────────────────────────
queryClient.invalidateQueries({ queryKey: ['drafts'] });
useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries(...), onError: (err) => toast({ variant: 'destructive' }) });

// ─ WS broadcast ───────────────────────────────────────────────────────────
broadcaster.toTenant(tenantId, { type: 'draft:created', payload: { draftId, count } });
```

---

_This document is the engineering law for the Execora codebase._
_Version: 1.0 — 2026-03-05_
_Maintained by: Update whenever a new pattern is established or a recurring bug type is identified._
