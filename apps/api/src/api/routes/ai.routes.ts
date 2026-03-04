/**
 * AI Routes — Sprint 2 AI Differentiators
 *
 * Endpoints:
 *  POST /api/v1/ai/purchase-bill/ocr       — upload supplier bill photo → async OCR
 *  POST /api/v1/ai/catalog/seed-from-photo — upload shelf photo → async catalog seed
 *  GET  /api/v1/ai/ocr-jobs/:id            — poll OCR job status
 *  GET  /api/v1/ai/replenishment-suggestions — deterministic reorder advice
 *  GET  /api/v1/ai/anomaly-check           — invoice total vs customer history
 *  POST /api/v1/ai/predictive-reminders/schedule — schedule smart reminders
 *
 * All protected routes inherit the `requireAuth` preHandler from the parent scope.
 * Errors are logged with pino structured fields; metrics are tracked via Prometheus.
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { aiService } from '@execora/modules';
import { minioClient, logger, prisma, tenantContext } from '@execora/infrastructure';
import { ocrJobQueue } from '@execora/infrastructure';
import { ocrJobsTotal, anomalyDetectionsTotal } from '@execora/infrastructure';
import { broadcaster } from '../../ws/broadcaster';
import { OcrJobData } from '@execora/infrastructure';

export async function aiRoutes(fastify: FastifyInstance) {
	// ── POST /api/v1/ai/purchase-bill/ocr ──────────────────────────────────────
	// Accepts a multipart image of a supplier/purchase bill.
	// Stores the image in MinIO, creates an OcrJob record, enqueues a BullMQ job,
	// and immediately returns { jobId, status: 'pending' }.
	// The frontend polls GET /api/v1/ai/ocr-jobs/:id to check completion.
	fastify.post('/api/v1/ai/purchase-bill/ocr', async (request, reply) => {
		const tenantId = (request as any).user?.tenantId ?? tenantContext.get().tenantId;
		const log = logger.child({ route: 'POST /ai/purchase-bill/ocr', tenantId });

		const data = await (request as any).file();
		if (!data) {
			return reply.code(400).send({ error: 'No image file provided' });
		}

		const mimeType = (data.mimetype as string) || 'image/jpeg';
		if (!mimeType.startsWith('image/')) {
			return reply.code(400).send({ error: 'File must be an image (jpeg, png, webp)' });
		}

		// Buffer the upload (≤ 15 MB guard)
		const chunks: Buffer[] = [];
		let totalSize = 0;
		for await (const chunk of data.file) {
			totalSize += chunk.length;
			if (totalSize > 15 * 1024 * 1024) {
				return reply.code(413).send({ error: 'Image too large (max 15 MB)' });
			}
			chunks.push(chunk);
		}
		const imageBuffer = Buffer.concat(chunks);

		// Store in MinIO
		const ext = mimeType.split('/')[1] ?? 'jpg';
		const imageKey = `ai/ocr/${tenantId}/${Date.now()}.${ext}`;
		await minioClient.uploadFile(imageKey, imageBuffer, { contentType: mimeType });

		// Create OcrJob row
		const jobRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO ocr_jobs (id, tenant_id, job_type, status, image_key, image_mime_type, created_at, updated_at)
      VALUES (gen_random_uuid(), ${tenantId}, 'purchase_bill', 'pending', ${imageKey}, ${mimeType}, NOW(), NOW())
      RETURNING id
    `;
		const ocrJobId = jobRows[0].id;

		// Enqueue BullMQ job
		await ocrJobQueue.add('process-ocr', { ocrJobId, tenantId } satisfies OcrJobData, { jobId: ocrJobId });

		ocrJobsTotal.inc({ job_type: 'purchase_bill', status: 'enqueued', tenantId });
		log.info({ ocrJobId }, 'Purchase bill OCR job enqueued');

		return reply.code(202).send({ jobId: ocrJobId, status: 'pending' });
	});

	// ── POST /api/v1/ai/catalog/seed-from-photo ────────────────────────────────
	// Same flow as above but for product catalog seeding from shelf photos.
	fastify.post('/api/v1/ai/catalog/seed-from-photo', async (request, reply) => {
		const tenantId = (request as any).user?.tenantId ?? tenantContext.get().tenantId;
		const log = logger.child({ route: 'POST /ai/catalog/seed-from-photo', tenantId });

		const data = await (request as any).file();
		if (!data) return reply.code(400).send({ error: 'No image file provided' });

		const mimeType = (data.mimetype as string) || 'image/jpeg';
		if (!mimeType.startsWith('image/')) {
			return reply.code(400).send({ error: 'File must be an image' });
		}

		const chunks: Buffer[] = [];
		let totalSize = 0;
		for await (const chunk of data.file) {
			totalSize += chunk.length;
			if (totalSize > 15 * 1024 * 1024) {
				return reply.code(413).send({ error: 'Image too large (max 15 MB)' });
			}
			chunks.push(chunk);
		}
		const imageBuffer = Buffer.concat(chunks);

		const ext = mimeType.split('/')[1] ?? 'jpg';
		const imageKey = `ai/catalog/${tenantId}/${Date.now()}.${ext}`;
		await minioClient.uploadFile(imageKey, imageBuffer, { contentType: mimeType });

		const jobRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO ocr_jobs (id, tenant_id, job_type, status, image_key, image_mime_type, created_at, updated_at)
      VALUES (gen_random_uuid(), ${tenantId}, 'product_catalog', 'pending', ${imageKey}, ${mimeType}, NOW(), NOW())
      RETURNING id
    `;
		const ocrJobId = jobRows[0].id;

		await ocrJobQueue.add('process-ocr', { ocrJobId, tenantId } satisfies OcrJobData, { jobId: ocrJobId });

		ocrJobsTotal.inc({ job_type: 'product_catalog', status: 'enqueued', tenantId });
		log.info({ ocrJobId }, 'Catalog seed OCR job enqueued');

		return reply.code(202).send({ jobId: ocrJobId, status: 'pending' });
	});

	// ── GET /api/v1/ai/ocr-jobs/:id ────────────────────────────────────────────
	// Returns the current status + result of an OCR job.
	// Frontend polls this until status is 'completed' or 'failed'.
	fastify.get<{ Params: { id: string } }>('/api/v1/ai/ocr-jobs/:id', async (request, reply) => {
		const tenantId = (request as any).user?.tenantId ?? tenantContext.get().tenantId;
		const { id } = request.params;

		const rows = await prisma.$queryRaw<
			Array<{
				id: string;
				job_type: string;
				status: string;
				parsed_items: unknown;
				purchase_order_id: string | null;
				products_created: number;
				error_message: string | null;
				processed_at: Date | null;
			}>
		>`
      SELECT id, job_type, status, parsed_items, purchase_order_id,
             products_created, error_message, processed_at
      FROM   ocr_jobs
      WHERE  id = ${id}::uuid AND tenant_id = ${tenantId}
    `;

		if (!rows[0]) return reply.code(404).send({ error: 'OCR job not found' });

		const job = rows[0];
		return {
			jobId: job.id,
			jobType: job.job_type,
			status: job.status,
			parsedItems: job.parsed_items ?? null,
			purchaseOrderId: job.purchase_order_id ?? null,
			productsCreated: job.products_created,
			errorMessage: job.error_message ?? null,
			processedAt: job.processed_at ?? null,
		};
	});

	// ── GET /api/v1/ai/replenishment-suggestions ───────────────────────────────
	// Returns products below minStock with suggested reorder quantities.
	// Completely deterministic — no AI calls, no side effects.
	fastify.get('/api/v1/ai/replenishment-suggestions', async (_request, _reply) => {
		const suggestions = await aiService.getReplenishmentSuggestions();
		return { suggestions };
	});

	// ── GET /api/v1/ai/anomaly-check ───────────────────────────────────────────
	// Query params: customerId (string), total (number)
	fastify.get(
		'/api/v1/ai/anomaly-check',
		async (request: FastifyRequest<{ Querystring: { customerId?: string; total?: string } }>, reply) => {
			const { customerId, total } = request.query;

			if (!customerId || !total) {
				return reply.code(400).send({ error: 'customerId and total query params are required' });
			}

			const proposedTotal = parseFloat(total);
			if (!isFinite(proposedTotal) || proposedTotal < 0) {
				return reply.code(400).send({ error: 'total must be a non-negative number' });
			}

			const result = await aiService.checkInvoiceAnomaly(customerId, proposedTotal);
			return { anomaly: result };
		}
	);

	// ── POST /api/v1/ai/predictive-reminders/schedule ─────────────────────────
	// Scans near-due invoices and schedules intelligent WhatsApp reminders.
	// Idempotent — skips invoices that already have a pending/sent reminder.
	fastify.post('/api/v1/ai/predictive-reminders/schedule', async (request, reply) => {
		const tenantId = (request as any).user?.tenantId ?? tenantContext.get().tenantId;
		const result = await aiService.schedulePredictiveReminders();

		// Broadcast so the UI reminder list refreshes
		broadcaster.send(tenantId, 'reminders:updated', { source: 'predictive_engine', ...result });

		logger.info({ tenantId, ...result }, 'Predictive reminders scheduled via API');
		return reply.code(201).send(result);
	});

	// ── GET /api/v1/ai/ocr-jobs ────────────────────────────────────────────────
	// Returns recent OCR jobs for this tenant (for the history list in the UI).
	fastify.get('/api/v1/ai/ocr-jobs', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, _reply) => {
		const tenantId = (request as any).user?.tenantId ?? tenantContext.get().tenantId;
		const limit = Math.min(parseInt(request.query.limit ?? '20', 10) || 20, 100);

		const jobs = await prisma.$queryRaw<
			Array<{
				id: string;
				job_type: string;
				status: string;
				products_created: number;
				purchase_order_id: string | null;
				error_message: string | null;
				processed_at: Date | null;
				created_at: Date;
			}>
		>`
        SELECT id, job_type, status, products_created, purchase_order_id,
               error_message, processed_at, created_at
        FROM   ocr_jobs
        WHERE  tenant_id = ${tenantId}
        ORDER  BY created_at DESC
        LIMIT  ${limit}
      `;

		return {
			jobs: jobs.map((j) => ({
				jobId: j.id,
				jobType: j.job_type,
				status: j.status,
				productsCreated: j.products_created,
				purchaseOrderId: j.purchase_order_id ?? null,
				errorMessage: j.error_message ?? null,
				processedAt: j.processed_at ?? null,
				createdAt: j.created_at,
			})),
		};
	});
}
