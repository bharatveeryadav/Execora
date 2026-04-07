/**
 * Inventory movements, barcode, and warehouse routes
 *
 * GET  /api/v1/inventory/barcode/lookup          — lookup product by barcode scan
 * GET  /api/v1/inventory/barcode/:productId      — generate barcode for product
 * GET  /api/v1/inventory/movements               — list stock movements (?productId=&type=)
 * POST /api/v1/inventory/adjustments             — create manual stock adjustment
 * GET  /api/v1/inventory/adjustments             — list stock adjustments (?productId=)
 * GET  /api/v1/inventory/warehouse/locations     — list warehouse locations
 * POST /api/v1/inventory/warehouse/locations     — create warehouse location
 * GET  /api/v1/inventory/valuation               — stock valuation report
 *
 * All routes require JWT auth (inherited from parent scope).
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import {
	lookupByBarcode,
	generateBarcode,
	createStockAdjustment,
	listStockAdjustments,
	listWarehouseLocations,
	createWarehouseLocation,
} from '@execora/modules';
import { prisma } from '@execora/core';

export async function inventoryMovementsRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/inventory/barcode/lookup ──────────────────────────────────
	fastify.get(
		'/api/v1/inventory/barcode/lookup',
		async (
			request: FastifyRequest<{ Querystring: { code?: string } }>,
			reply,
		) => {
			const tenantId = request.user!.tenantId;
			const code = (request.query.code ?? '').trim();
			if (!code) return reply.code(400).send({ error: 'code query param required' });
			const result = await lookupByBarcode(tenantId, code);
			if (!result) return reply.code(404).send({ error: 'Product not found for barcode' });
			return { product: result };
		},
	);

	// ── GET /api/v1/inventory/barcode/:productId ──────────────────────────────
	fastify.get<{ Params: { productId: string }; Querystring: { format?: string } }>(
		'/api/v1/inventory/barcode/:productId',
		async (request, reply) => {
			const tenantId = request.user!.tenantId;
			const product = await prisma.product.findFirst({
				where: { id: request.params.productId, tenantId },
				select: { id: true, name: true },
			});
			if (!product) return reply.code(404).send({ error: 'Product not found' });
			const fmt = (request.query.format ?? 'ean13') as 'ean13' | 'code128' | 'qr';
			const barcode = generateBarcode(product.id, fmt);
			return { barcode };
		},
	);

	// ── GET /api/v1/inventory/movements ──────────────────────────────────────
	fastify.get(
		'/api/v1/inventory/movements',
		async (
			request: FastifyRequest<{
				Querystring: {
					productId?: string;
					type?: string;
					from?: string;
					to?: string;
					limit?: string;
					offset?: string;
				};
			}>,
		) => {
			const tenantId = request.user!.tenantId;
			const limit = Math.min(parseInt(String(request.query.limit ?? 50), 10) || 50, 200);
			const offset = parseInt(String(request.query.offset ?? 0), 10) || 0;

			const where: Record<string, unknown> = { tenantId };
			if (request.query.productId) where.productId = request.query.productId;
			if (request.query.type) where.movementType = request.query.type;
			if (request.query.from || request.query.to) {
				where.createdAt = {
					...(request.query.from ? { gte: new Date(request.query.from) } : {}),
					...(request.query.to ? { lte: new Date(request.query.to) } : {}),
				};
			}

			const [movements, total] = await prisma.$transaction([
				prisma.stockMovement.findMany({
					where,
					orderBy: { createdAt: 'desc' },
					take: limit,
					skip: offset,
				}),
				prisma.stockMovement.count({ where }),
			]);
			return { movements, total, limit, offset };
		},
	);

	// ── POST /api/v1/inventory/adjustments ───────────────────────────────────
	fastify.post(
		'/api/v1/inventory/adjustments',
		{
			schema: {
				body: {
					type: 'object',
					required: ['productId', 'quantity', 'reason'],
					properties: {
						productId: { type: 'string', minLength: 1 },
						quantity: { type: 'number' },
						reason: { type: 'string', enum: ['damage', 'loss', 'theft', 'opening-balance', 'audit', 'other'] },
						note: { type: 'string', maxLength: 500 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					productId: string;
					quantity: number;
					reason: 'damage' | 'loss' | 'theft' | 'opening-balance' | 'audit' | 'other';
					note?: string;
				};
			}>,
			reply,
		) => {
			const tenantId = request.user!.tenantId;
			const product = await prisma.product.findFirst({
				where: { id: request.body.productId, tenantId },
				select: { id: true },
			});
			if (!product) return reply.code(404).send({ error: 'Product not found' });
			const adjustment = await createStockAdjustment(tenantId, request.body);
			return reply.code(201).send({ adjustment });
		},
	);

	// ── GET /api/v1/inventory/adjustments ────────────────────────────────────
	fastify.get(
		'/api/v1/inventory/adjustments',
		async (request: FastifyRequest<{ Querystring: { productId?: string } }>) => {
			const tenantId = request.user!.tenantId;
			const adjustments = await listStockAdjustments(tenantId, request.query.productId);
			return { adjustments };
		},
	);

	// ── GET /api/v1/inventory/warehouse/locations ─────────────────────────────
	fastify.get('/api/v1/inventory/warehouse/locations', async (request: FastifyRequest) => {
		const tenantId = request.user!.tenantId;
		const locations = await listWarehouseLocations(tenantId);
		return { locations };
	});

	// ── POST /api/v1/inventory/warehouse/locations ────────────────────────────
	fastify.post(
		'/api/v1/inventory/warehouse/locations',
		{
			schema: {
				body: {
					type: 'object',
					required: ['code', 'name'],
					properties: {
						code: { type: 'string', minLength: 1, maxLength: 50 },
						name: { type: 'string', minLength: 1, maxLength: 255 },
						zone: { type: 'string', maxLength: 100 },
						aisle: { type: 'string', maxLength: 100 },
						bin: { type: 'string', maxLength: 100 },
						parentLocationId: { type: 'string' },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					code: string;
					name: string;
					zone?: string;
					aisle?: string;
					bin?: string;
					parentLocationId?: string;
				};
			}>,
			reply,
		) => {
			const tenantId = request.user!.tenantId;
			const location = await createWarehouseLocation({ tenantId, ...request.body });
			return reply.code(201).send({ location });
		},
	);

	// ── GET /api/v1/inventory/valuation ──────────────────────────────────────
	// Stock valuation: sum(stock * cost) per product.
	fastify.get('/api/v1/inventory/valuation', async (request: FastifyRequest) => {
		const tenantId = request.user!.tenantId;
		const products = await prisma.product.findMany({
			where: { tenantId, isActive: true },
			select: { id: true, name: true, sku: true, stock: true, cost: true, price: true },
		});
		let totalValue = 0;
		const items = products.map((p) => {
			const costPrice = Number(p.cost ?? p.price ?? 0);
			const value = Number(p.stock) * costPrice;
			totalValue += value;
			return { productId: p.id, name: p.name, sku: p.sku, stock: Number(p.stock), costPrice, value: Math.round(value * 100) / 100 };
		});
		return {
			items,
			totalValue: Math.round(totalValue * 100) / 100,
			productCount: items.length,
		};
	});
}
