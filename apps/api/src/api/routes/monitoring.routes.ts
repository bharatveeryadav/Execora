import { FastifyInstance, FastifyRequest } from 'fastify';
import { monitoringService } from '@execora/modules';
import { broadcaster } from '../../ws/broadcaster';

function parseLimit(raw: unknown, def = 50, max = 200): number {
	const n = parseInt(String(raw ?? def), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

export async function monitoringRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/monitoring/events ────────────────────────────────────────
	fastify.get(
		'/api/v1/monitoring/events',
		async (
			request: FastifyRequest<{
				Querystring: {
					limit?: string;
					offset?: string;
					eventType?: string;
					severity?: string;
					userId?: string;
					from?: string;
					to?: string;
					unreadOnly?: string;
				};
			}>,
		) => {
			const { tenantId, role } = request.user!;
			if (role !== 'owner' && role !== 'admin') {
				return (request as any).server.httpErrors?.forbidden?.() ??
					{ statusCode: 403, error: 'Forbidden', message: 'Owner or admin role required' };
			}
			const q = request.query;
			const result = await monitoringService.getEvents(tenantId, {
				limit:      parseLimit(q.limit, 50),
				offset:     parseInt(q.offset ?? '0', 10) || 0,
				eventType:  q.eventType,
				severity:   q.severity,
				userId:     q.userId,
				from:       q.from ? new Date(q.from) : undefined,
				to:         q.to   ? new Date(q.to)   : undefined,
				unreadOnly: q.unreadOnly === 'true',
			});
			return result;
		},
	);

	// ── GET /api/v1/monitoring/events/unread ─────────────────────────────────
	fastify.get('/api/v1/monitoring/events/unread', async (request, reply) => {
		const { tenantId } = request.user!;
		const count = await monitoringService.getUnreadAlertCount(tenantId);
		return { count };
	});

	// ── POST /api/v1/monitoring/events/read-all ──────────────────────────────
	fastify.post('/api/v1/monitoring/events/read-all', async (request, reply) => {
		const { tenantId } = request.user!;
		await monitoringService.markAllRead(tenantId);
		return reply.code(204).send();
	});

	// ── POST /api/v1/monitoring/events/:id/read ──────────────────────────────
	fastify.post<{ Params: { id: string } }>(
		'/api/v1/monitoring/events/:id/read',
		async (request, reply) => {
			const { tenantId } = request.user!;
			await monitoringService.markRead(tenantId, request.params.id);
			return reply.code(204).send();
		},
	);

	// ── GET /api/v1/monitoring/stats ─────────────────────────────────────────
	fastify.get(
		'/api/v1/monitoring/stats',
		async (
			request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>,
		) => {
			const { tenantId } = request.user!;
			const now  = new Date();
			const from = request.query.from
				? new Date(request.query.from)
				: new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const to   = request.query.to ? new Date(request.query.to) : now;
			return monitoringService.getStats(tenantId, from, to);
		},
	);

	// ── GET /api/v1/monitoring/config ────────────────────────────────────────
	fastify.get('/api/v1/monitoring/config', async (request) => {
		const { tenantId } = request.user!;
		const config = await monitoringService.getConfig(tenantId);
		// Return defaults if not configured yet
		return {
			config: config ?? {
				tenantId,
				enabled:            true,
				snapsOnBills:       true,
				snapsOnPayments:    true,
				alertDiscountAbove: 20,
				alertCancelAbove:   2000,
				alertBillAbove:     null,
				ownerPhoneAlert:    true,
				cameraEnabled:      false,
				cameraSource:       'webcam',
				ipCameraUrl:        null,
				retentionDays:      30,
			},
		};
	});

	// ── PUT /api/v1/monitoring/config ────────────────────────────────────────
	fastify.put(
		'/api/v1/monitoring/config',
		{
			schema: {
				body: {
					type: 'object',
					properties: {
						enabled:            { type: 'boolean' },
						snapsOnBills:       { type: 'boolean' },
						snapsOnPayments:    { type: 'boolean' },
						alertDiscountAbove: { type: 'number', minimum: 0, maximum: 100 },
						alertCancelAbove:   { type: 'number', minimum: 0 },
						alertBillAbove:     { type: ['number', 'null'] },
						ownerPhoneAlert:    { type: 'boolean' },
						cameraEnabled:      { type: 'boolean' },
						cameraSource:       { type: 'string', enum: ['webcam', 'ip', 'phone'] },
						ipCameraUrl:        { type: ['string', 'null'] },
						retentionDays:      { type: 'integer', minimum: 1, maximum: 365 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					enabled?: boolean;
					snapsOnBills?: boolean;
					snapsOnPayments?: boolean;
					alertDiscountAbove?: number;
					alertCancelAbove?: number;
					alertBillAbove?: number | null;
					ownerPhoneAlert?: boolean;
					cameraEnabled?: boolean;
					cameraSource?: string;
					ipCameraUrl?: string | null;
					retentionDays?: number;
				};
			}>,
		) => {
			const { tenantId, role } = request.user!;
			if (role !== 'owner') {
				return { statusCode: 403, error: 'Forbidden', message: 'Only owner can change monitoring config' };
			}
			const config = await monitoringService.upsertConfig(tenantId, request.body);
			return { config };
		},
	);

	// ── POST /api/v1/monitoring/events — manual event (e.g. cash drawer open) ─
	fastify.post(
		'/api/v1/monitoring/events',
		{
			schema: {
				body: {
					type: 'object',
					required: ['eventType', 'entityType', 'entityId', 'description'],
					properties: {
						eventType:   { type: 'string' },
						entityType:  { type: 'string' },
						entityId:    { type: 'string' },
						description: { type: 'string', maxLength: 500 },
						amount:      { type: 'number' },
						meta:        { type: 'object' },
						severity:    { type: 'string', enum: ['info', 'warning', 'alert'] },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					eventType: string; entityType: string; entityId: string;
					description: string; amount?: number; meta?: Record<string, unknown>;
					severity?: 'info' | 'warning' | 'alert';
				};
			}>,
			reply,
		) => {
			const { tenantId, userId } = request.user!;
			await monitoringService.recordEvent({ tenantId, userId, ...request.body });
			// Broadcast to connected owner tabs
			broadcaster.send(tenantId, 'monitoring:event', {
				eventType:   request.body.eventType,
				description: request.body.description,
				severity:    request.body.severity ?? 'info',
				amount:      request.body.amount,
			});
			return reply.code(201).send({ ok: true });
		},
	);

	// ── POST /api/v1/monitoring/snap — upload JPEG snapshot ─────────────────
	fastify.post('/api/v1/monitoring/snap', async (request, reply) => {
		const { tenantId, userId } = request.user!;

		const parts = request.parts();
		let imageBuffer: Buffer | null = null;
		let eventType = 'bill.created';
		let entityType = 'invoice';
		let entityId = 'unknown';
		let description: string | undefined;

		for await (const part of parts) {
			if (part.type === 'file' && part.fieldname === 'snap') {
				const chunks: Buffer[] = [];
				for await (const chunk of part.file) chunks.push(chunk);
				imageBuffer = Buffer.concat(chunks);
			} else if (part.type === 'field') {
				if (part.fieldname === 'eventType')   eventType   = String(part.value);
				if (part.fieldname === 'entityType')  entityType  = String(part.value);
				if (part.fieldname === 'entityId')    entityId    = String(part.value);
				if (part.fieldname === 'description') description = String(part.value);
			}
		}

		if (!imageBuffer || imageBuffer.length === 0) {
			return reply.code(400).send({ error: 'No image data received' });
		}

		const result = await monitoringService.storeSnap(tenantId, userId, imageBuffer, {
			eventType, entityType, entityId, description,
		});

		broadcaster.send(tenantId, 'monitoring:snap', { eventId: result.eventId, snapKey: result.snapKey });
		return reply.code(201).send({ ok: true, snapKey: result.snapKey, eventId: result.eventId });
	});

	// ── GET /api/v1/monitoring/snap/:key — presigned URL ─────────────────────
	fastify.get<{ Params: { '*': string } }>(
		'/api/v1/monitoring/snap/*',
		async (request, reply) => {
			const { tenantId } = request.user!;
			const snapKey = request.params['*'];
			try {
				const url = await monitoringService.getSnapPresignedUrl(tenantId, snapKey);
				return { url };
			} catch {
				return reply.code(403).send({ error: 'Forbidden' });
			}
		},
	);
}
