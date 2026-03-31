/**
 * Supplier routes — list and create suppliers for Purchase Orders.
 *
 * GET  /api/v1/suppliers         — list (optional ?q= search)
 * POST /api/v1/suppliers         — create
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { Prisma } from '@prisma/client';

function parseLimit(raw: unknown, defaultVal = 50, maxVal = 200): number {
	const n = parseInt(String(raw ?? defaultVal), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function supplierRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/suppliers ─────────────────────────────────────────────────
	fastify.get(
		'/api/v1/suppliers',
		async (
			request: FastifyRequest<{
				Querystring: { q?: string; limit?: string };
			}>
		) => {
			const tenantId = request.user!.tenantId;
			const q = (request.query.q ?? '').trim();
			const limit = parseLimit(request.query.limit, 50);

			const where: Prisma.SupplierWhereInput = { tenantId };
			if (q) {
				where.OR = [
					{ name: { contains: q, mode: 'insensitive' } },
					{ companyName: { contains: q, mode: 'insensitive' } },
					{ phone: { contains: q } },
				];
			}

			const suppliers = await prisma.supplier.findMany({
				where,
				take: limit,
				orderBy: { name: 'asc' },
			});
			return { suppliers };
		}
	);

	// ── POST /api/v1/suppliers ────────────────────────────────────────────────
	fastify.post(
		'/api/v1/suppliers',
		{
			schema: {
				body: {
					type: 'object',
					required: ['name'],
					properties: {
						name: { type: 'string', minLength: 1, maxLength: 255 },
						companyName: { type: 'string', maxLength: 255 },
						phone: { type: 'string', maxLength: 20 },
						email: { type: 'string', maxLength: 255 },
						address: { type: 'string', maxLength: 500 },
						gstin: { type: 'string', maxLength: 15 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					name: string;
					companyName?: string;
					phone?: string;
					email?: string;
					address?: string;
					gstin?: string;
				};
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const { name, companyName, phone, email, address, gstin } = request.body;

			const supplier = await prisma.supplier.create({
				data: {
					tenantId,
					name: name.trim(),
					companyName: companyName?.trim() || null,
					phone: phone?.trim() || null,
					email: email?.trim() || null,
					address: address?.trim() || null,
					gstin: gstin?.trim() || null,
				},
			});
			return reply.code(201).send({ supplier });
		}
	);
}
