/**
 * Draft / Staging System — /api/v1/drafts
 *
 * Any form submission (purchase, product, stock-adjustment) first creates a
 * Draft record. The user can review, edit, and confirm the draft at any time.
 * Confirmation executes the real DB write and broadcasts real-time WS events.
 *
 * Draft types:
 *  • purchase_entry  → Expense (type:'purchase') + broadcaster 'purchase:created'
 *  • product         → Product create          + broadcaster 'product:created'
 *  • stock_adjustment→ Product stock increment + broadcaster 'product:updated'
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { broadcaster } from '../../ws/broadcaster';

type DraftType = 'purchase_entry' | 'product' | 'stock_adjustment';
type DraftStatus = 'pending' | 'confirmed' | 'discarded';

// ─── helpers ─────────────────────────────────────────────────────────────────

function tenantId(req: FastifyRequest): string {
	return req.user!.tenantId;
}

// ─── confirm dispatch ─────────────────────────────────────────────────────────

async function executeDraft(draft: { id: string; type: string; data: unknown; tenantId: string }) {
	const data = draft.data as Record<string, any>;
	const tid = draft.tenantId;

	switch (draft.type as DraftType) {
		case 'purchase_entry': {
			const expense = await prisma.expense.create({
				data: {
					tenantId: tid,
					type: 'purchase',
					category: data.category ?? 'Purchases',
					amount: new Decimal(data.amount ?? 0),
					itemName: data.itemName ?? null,
					vendor: data.vendor ?? null,
					quantity: data.quantity != null ? new Decimal(data.quantity) : null,
					unit: data.unit ?? null,
					ratePerUnit: data.ratePerUnit != null ? new Decimal(data.ratePerUnit) : null,
					note: data.note ?? null,
					date: data.date ? new Date(data.date) : new Date(),
				},
			});
			broadcaster.send(tid, 'purchase:created', { expense });
			return { expense };
		}

		case 'product': {
			const product = await prisma.product.create({
				data: {
					tenantId: tid,
					name: data.name,
					category: data.category ?? 'General',
					subCategory: data.subCategory ?? null,
					price: new Decimal(data.price ?? 0),
					mrp: data.mrp != null ? new Decimal(data.mrp) : null,
					cost: data.cost != null ? new Decimal(data.cost) : null,
					unit: data.unit ?? 'pcs',
					sku: data.sku ?? null,
					barcode: data.barcode ?? null,
					stock: data.stock ?? 0,
					minStock: data.minStock ?? 5,
					description: data.description ?? null,
					hsnCode: data.hsnCode ?? null,
					gstRate: data.gstRate != null ? new Decimal(data.gstRate) : new Decimal(0),
					imageUrl: data.imageUrl ?? null,
					preferredSupplier: data.preferredSupplier ?? null,
				},
			});
			broadcaster.send(tid, 'product:created', { product });
			return { product };
		}

		case 'stock_adjustment': {
			const { productId, qty, direction } = data as {
				productId: string;
				qty: number;
				direction: 'in' | 'out';
			};
			const delta = direction === 'out' ? -Math.abs(qty) : Math.abs(qty);
			const product = await prisma.product.update({
				where: { id: productId },
				data: { stock: { increment: delta } },
			});
			broadcaster.send(tid, 'product:updated', { product });
			return { product };
		}

		default:
			throw new Error(`Unknown draft type: ${draft.type}`);
	}
}

// ─── route plugin ─────────────────────────────────────────────────────────────

export async function draftRoutes(fastify: FastifyInstance) {
	// ── POST /api/v1/drafts ────────────────────────────────────────────────────
	fastify.post(
		'/api/v1/drafts',
		{
			schema: {
				body: {
					type: 'object',
					required: ['type', 'data'],
					properties: {
						type: { type: 'string', enum: ['purchase_entry', 'product', 'stock_adjustment'] },
						title: { type: 'string' },
						data: { type: 'object' },
						notes: { type: 'string' },
					},
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					type: DraftType;
					title?: string;
					data: Record<string, unknown>;
					notes?: string;
				};
			}>
		) => {
			const tid = tenantId(request);
			const { type, title, data, notes } = request.body;

			const draft = await prisma.draft.create({
				data: {
					tenantId: tid,
					type,
					title: title ?? null,
					data: data as Prisma.InputJsonValue,
					notes: notes ?? null,
					createdBy: request.user!.userId,
				},
			});

			broadcaster.send(tid, 'draft:created', { draft });
			return { draft };
		}
	);

	// ── GET /api/v1/drafts ────────────────────────────────────────────────────
	fastify.get(
		'/api/v1/drafts',
		async (
			request: FastifyRequest<{
				Querystring: { type?: string; status?: string; limit?: string };
			}>
		) => {
			const tid = tenantId(request);
			const { type, status = 'pending' } = request.query;
			const limit = Math.min(parseInt(request.query.limit ?? '100', 10) || 100, 200);

			const drafts = await prisma.draft.findMany({
				where: {
					tenantId: tid,
					...(type ? { type } : {}),
					status,
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			});
			return { drafts, count: drafts.length };
		}
	);

	// ── GET /api/v1/drafts/:id ────────────────────────────────────────────────
	fastify.get('/api/v1/drafts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
		const tid = tenantId(request);
		const draft = await prisma.draft.findFirst({
			where: { id: request.params.id, tenantId: tid },
		});
		if (!draft) return reply.code(404).send({ error: 'Draft not found' });
		return { draft };
	});

	// ── PUT /api/v1/drafts/:id ────────────────────────────────────────────────
	fastify.put(
		'/api/v1/drafts/:id',
		{
			schema: {
				body: {
					type: 'object',
					properties: {
						data: { type: 'object' },
						title: { type: 'string' },
						notes: { type: 'string' },
					},
				},
			},
		},
		async (
			request: FastifyRequest<{
				Params: { id: string };
				Body: { data?: Record<string, unknown>; title?: string; notes?: string };
			}>,
			reply
		) => {
			const tid = tenantId(request);
			const existing = await prisma.draft.findFirst({
				where: { id: request.params.id, tenantId: tid },
			});
			if (!existing) return reply.code(404).send({ error: 'Draft not found' });
			if (existing.status !== 'pending') {
				return reply.code(409).send({ error: `Draft is already ${existing.status}` });
			}

			const patch = request.body;
			const draft = await prisma.draft.update({
				where: { id: request.params.id },
				data: {
					...(patch.data !== undefined ? { data: patch.data as Prisma.InputJsonValue } : {}),
					...(patch.title !== undefined ? { title: patch.title } : {}),
					...(patch.notes !== undefined ? { notes: patch.notes } : {}),
				},
			});

			broadcaster.send(tid, 'draft:updated', { draft });
			return { draft };
		}
	);

	// ── POST /api/v1/drafts/:id/confirm ──────────────────────────────────────
	fastify.post('/api/v1/drafts/:id/confirm', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
		const tid = tenantId(request);
		const existing = await prisma.draft.findFirst({
			where: { id: request.params.id, tenantId: tid },
		});
		if (!existing) return reply.code(404).send({ error: 'Draft not found' });
		if (existing.status !== 'pending') {
			return reply.code(409).send({ error: `Draft is already ${existing.status}` });
		}

		let result: unknown;
		try {
			result = await executeDraft({
				id: existing.id,
				type: existing.type,
				data: existing.data,
				tenantId: tid,
			});
		} catch (err: any) {
			fastify.log.error({ draftId: existing.id, err }, 'Draft confirm failed');
			return reply.code(422).send({ error: err?.message ?? 'Confirm failed' });
		}

		const draft = await prisma.draft.update({
			where: { id: existing.id },
			data: { status: 'confirmed', confirmedAt: new Date() },
		});

		broadcaster.send(tid, 'draft:confirmed', {
			draftId: draft.id,
			type: draft.type,
			title: draft.title,
		});

		return { draft, result };
	});

	// ── DELETE /api/v1/drafts/:id ─────────────────────────────────────────────
	fastify.delete('/api/v1/drafts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
		const tid = tenantId(request);
		const existing = await prisma.draft.findFirst({
			where: { id: request.params.id, tenantId: tid },
		});
		if (!existing) return reply.code(404).send({ error: 'Draft not found' });

		const draft = await prisma.draft.update({
			where: { id: existing.id },
			data: { status: 'discarded', discardedAt: new Date() },
		});

		broadcaster.send(tid, 'draft:discarded', { draftId: draft.id });
		return { ok: true };
	});
}
