/**
 * Purchase Order routes — create, list, receive, cancel.
 *
 * POST   /api/v1/purchase-orders             — create
 * GET    /api/v1/purchase-orders             — list (filter: status, supplierId)
 * GET    /api/v1/purchase-orders/:id         — single PO
 * PATCH  /api/v1/purchase-orders/:id         — update draft
 * POST   /api/v1/purchase-orders/:id/receive — mark goods received (updates stock)
 * POST   /api/v1/purchase-orders/:id/cancel  — cancel
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function parseLimit(raw: unknown, defaultVal = 50, maxVal = 100): number {
	const n = parseInt(String(raw ?? defaultVal), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

async function generatePoNo(tenantId: string): Promise<string> {
	const now = new Date();
	const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
	const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;

	const last = await prisma.purchaseOrder.findFirst({
		where: { tenantId, poNo: { startsWith: `PO/${fyLabel}/` } },
		orderBy: { createdAt: 'desc' },
		select: { poNo: true },
	});

	let seq = 1;
	if (last) {
		const parts = last.poNo.split('/');
		seq = parseInt(parts[parts.length - 1], 10) + 1;
	}
	return `PO/${fyLabel}/${seq}`;
}

export async function purchaseOrderRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/purchase-orders ────────────────────────────────────────────
	fastify.get(
		'/api/v1/purchase-orders',
		async (
			request: FastifyRequest<{
				Querystring: { status?: string; supplierId?: string; limit?: string };
			}>
		) => {
			const tenantId = request.user!.tenantId;
			const limit = parseLimit(request.query.limit, 50);

			const where: Prisma.PurchaseOrderWhereInput = { tenantId };
			if (request.query.status) where.status = request.query.status;
			if (request.query.supplierId) where.supplierId = request.query.supplierId;

			const orders = await prisma.purchaseOrder.findMany({
				where,
				take: limit,
				orderBy: { orderDate: 'desc' },
				include: {
					supplier: { select: { id: true, name: true, phone: true } },
					items: {
						include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
					},
				},
			});
			return { purchaseOrders: orders };
		}
	);

	// ── GET /api/v1/purchase-orders/:id ─────────────────────────────────────────
	fastify.get<{ Params: { id: string } }>(
		'/api/v1/purchase-orders/:id',
		async (request, reply) => {
			const tenantId = request.user!.tenantId;
			const po = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
				include: {
					supplier: true,
					items: {
						include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
					},
				},
			});
			if (!po) return reply.code(404).send({ error: 'Purchase order not found' });
			return { purchaseOrder: po };
		}
	);

	// ── POST /api/v1/purchase-orders ──────────────────────────────────────────
	fastify.post(
		'/api/v1/purchase-orders',
		{
			schema: {
				body: {
					type: 'object',
					required: ['items'],
					properties: {
						supplierId: { type: 'string' },
						expectedDate: { type: 'string' },
						notes: { type: 'string', maxLength: 1000 },
						status: { type: 'string', enum: ['draft', 'pending'] },
						items: {
							type: 'array',
							minItems: 1,
							items: {
								type: 'object',
								required: ['productId', 'quantity', 'unitPrice'],
								properties: {
									productId: { type: 'string' },
									quantity: { type: 'integer', minimum: 1 },
									unitPrice: { type: 'number', minimum: 0 },
									batchNo: { type: 'string', maxLength: 50 },
									expiryDate: { type: 'string' },
								},
								additionalProperties: false,
							},
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					supplierId?: string;
					expectedDate?: string;
					notes?: string;
					status?: 'draft' | 'pending';
					items: Array<{
						productId: string;
						quantity: number;
						unitPrice: number;
						batchNo?: string;
						expiryDate?: string;
					}>;
				};
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const userId = request.user!.userId;
			const { supplierId, expectedDate, notes, status = 'pending', items } = request.body;

			let subtotal = 0;
			const itemData = items.map((it) => {
				const total = it.quantity * it.unitPrice;
				subtotal += total;
				return {
					productId: it.productId,
					quantity: it.quantity,
					unitPrice: new Decimal(it.unitPrice),
					total: new Decimal(total),
					batchNo: it.batchNo?.trim() || null,
					expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
				};
			});

			const poNo = await generatePoNo(tenantId);
			const total = subtotal;
			const tax = 0;

			const po = await prisma.purchaseOrder.create({
				data: {
					tenantId,
					poNo,
					supplierId: supplierId?.trim() || null,
					expectedDate: expectedDate ? new Date(expectedDate) : null,
					subtotal: new Decimal(subtotal),
					tax: new Decimal(tax),
					total: new Decimal(total),
					status,
					notes: notes?.trim() || null,
					createdBy: userId,
					items: { create: itemData },
				},
				include: {
					supplier: { select: { id: true, name: true, phone: true } },
					items: {
						include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
					},
				},
			});
			return reply.code(201).send({ purchaseOrder: po });
		}
	);

	// ── PATCH /api/v1/purchase-orders/:id ──────────────────────────────────────
	fastify.patch(
		'/api/v1/purchase-orders/:id',
		{
			schema: {
				body: {
					type: 'object',
					properties: {
						supplierId: { type: 'string' },
						expectedDate: { type: 'string' },
						notes: { type: 'string', maxLength: 1000 },
						status: { type: 'string', enum: ['draft', 'pending'] },
						items: {
							type: 'array',
							minItems: 1,
							items: {
								type: 'object',
								required: ['productId', 'quantity', 'unitPrice'],
								properties: {
									productId: { type: 'string' },
									quantity: { type: 'integer', minimum: 1 },
									unitPrice: { type: 'number', minimum: 0 },
									batchNo: { type: 'string' },
									expiryDate: { type: 'string' },
								},
								additionalProperties: false,
							},
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Params: { id: string };
				Body: {
					supplierId?: string;
					expectedDate?: string;
					notes?: string;
					status?: 'draft' | 'pending';
					items?: Array<{
						productId: string;
						quantity: number;
						unitPrice: number;
						batchNo?: string;
						expiryDate?: string;
					}>;
				};
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const existing = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
				include: { items: true },
			});
			if (!existing) return reply.code(404).send({ error: 'Purchase order not found' });
			if (existing.status === 'received' || existing.status === 'cancelled') {
				return reply.code(400).send({ error: 'Cannot edit received or cancelled PO' });
			}

			const updates: Prisma.PurchaseOrderUpdateInput = {};
			if (request.body.supplierId !== undefined) {
				updates.supplier = request.body.supplierId
					? { connect: { id: request.body.supplierId } }
					: { disconnect: true };
			}
			if (request.body.expectedDate !== undefined) updates.expectedDate = request.body.expectedDate ? new Date(request.body.expectedDate) : null;
			if (request.body.notes !== undefined) updates.notes = request.body.notes?.trim() || null;
			if (request.body.status !== undefined) updates.status = request.body.status;

			if (request.body.items && request.body.items.length > 0) {
				let subtotal = 0;
				const itemData = request.body.items.map((it) => {
					const total = it.quantity * it.unitPrice;
					subtotal += total;
					return {
						productId: it.productId,
						quantity: it.quantity,
						unitPrice: new Decimal(it.unitPrice),
						total: new Decimal(total),
						batchNo: it.batchNo?.trim() || null,
						expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
					};
				});
				updates.subtotal = new Decimal(subtotal);
				updates.tax = new Decimal(0);
				updates.total = new Decimal(subtotal);
				updates.items = {
					deleteMany: {},
					create: itemData,
				};
			}

			const po = await prisma.purchaseOrder.update({
				where: { id: request.params.id },
				data: updates,
				include: {
					supplier: { select: { id: true, name: true, phone: true } },
					items: {
						include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
					},
				},
			});
			return { purchaseOrder: po };
		}
	);

	// ── POST /api/v1/purchase-orders/:id/receive ────────────────────────────────
	fastify.post(
		'/api/v1/purchase-orders/:id/receive',
		{
			schema: {
				body: {
					type: 'object',
					required: ['receipts'],
					properties: {
						receipts: {
							type: 'array',
							minItems: 1,
							items: {
								type: 'object',
								required: ['itemId', 'receivedQty'],
								properties: {
									itemId: { type: 'string' },
									receivedQty: { type: 'integer', minimum: 0 },
									batchNo: { type: 'string' },
									expiryDate: { type: 'string' },
								},
								additionalProperties: false,
							},
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Params: { id: string };
				Body: {
					receipts: Array<{
						itemId: string;
						receivedQty: number;
						batchNo?: string;
						expiryDate?: string;
					}>;
				};
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const po = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
				include: { items: { include: { product: true } } },
			});
			if (!po) return reply.code(404).send({ error: 'Purchase order not found' });
			if (po.status === 'cancelled') {
				return reply.code(400).send({ error: 'Cannot receive cancelled PO' });
			}

			await prisma.$transaction(async (tx) => {
				for (const r of request.body.receipts) {
					const item = po.items.find((i) => i.id === r.itemId);
					if (!item) continue;
					const qty = Math.min(r.receivedQty, item.quantity - item.receivedQuantity);
					if (qty <= 0) continue;

					await tx.purchaseOrderItem.update({
						where: { id: r.itemId },
						data: { receivedQuantity: { increment: qty } },
					});

					// Update product stock
					await tx.product.update({
						where: { id: item.productId },
						data: { stock: { increment: qty } },
					});

					// Create/update batch when batchNo or expiryDate provided
					if (r.batchNo?.trim() || r.expiryDate) {
						const batchNo = r.batchNo?.trim() || `B-${Date.now()}`;
						const expiryDate = r.expiryDate ? new Date(r.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
						try {
							await tx.productBatch.upsert({
								where: {
									tenantId_productId_batchNo: {
										tenantId,
										productId: item.productId,
										batchNo,
									},
								},
								create: {
									tenantId,
									productId: item.productId,
									batchNo,
									expiryDate,
									quantity: qty,
									initialQuantity: qty,
									purchasePrice: item.unitPrice,
									purchaseDate: new Date(),
									supplierId: po.supplierId,
								},
								update: { quantity: { increment: qty } },
							});
						} catch {
							// Batch upsert failed (e.g. constraint) — stock already updated, continue
						}
					}
				}

				// Update PO status
				const updated = await tx.purchaseOrder.findUnique({
					where: { id: po.id },
					include: { items: true },
				});
				if (!updated) return;
				const allReceived = updated.items.every((i) => i.receivedQuantity >= i.quantity);
				const anyReceived = updated.items.some((i) => i.receivedQuantity > 0);
				const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : updated.status;
				await tx.purchaseOrder.update({
					where: { id: po.id },
					data: {
						status: newStatus,
						...(allReceived && { receivedDate: new Date() }),
					},
				});
			});

			const updated = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
				include: {
					supplier: { select: { id: true, name: true } },
					items: { include: { product: { select: { id: true, name: true } } } },
				},
			});
			return { purchaseOrder: updated };
		}
	);

	// ── POST /api/v1/purchase-orders/:id/cancel ─────────────────────────────────
	fastify.post<{ Params: { id: string } }>(
		'/api/v1/purchase-orders/:id/cancel',
		async (request, reply) => {
			const tenantId = request.user!.tenantId;
			const po = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
			});
			if (!po) return reply.code(404).send({ error: 'Purchase order not found' });
			if (po.status === 'received') {
				return reply.code(400).send({ error: 'Cannot cancel fully received PO' });
			}

			await prisma.purchaseOrder.update({
				where: { id: request.params.id },
				data: { status: 'cancelled' },
			});
			const updated = await prisma.purchaseOrder.findFirst({
				where: { id: request.params.id, tenantId },
				include: {
					supplier: { select: { id: true, name: true } },
					items: { include: { product: { select: { id: true, name: true } } } },
				},
			});
			return { purchaseOrder: updated };
		}
	);
}
