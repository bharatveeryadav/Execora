/**
 * Expense & Purchase Routes — /api/v1/expenses and /api/v1/purchases
 *
 * Both expenses (operating costs) and purchases (stock buys) are stored
 * in the unified `expenses` table with a `type` discriminator.
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { Decimal } from '@prisma/client/runtime/library';

function parseDateRange(from?: string, to?: string) {
	const f = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
	const t = to ? new Date(to) : new Date();
	t.setHours(23, 59, 59, 999);
	return { f, t };
}

export async function expenseRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/expenses ──────────────────────────────────────────────────
	fastify.get(
		'/api/v1/expenses',
		async (
			request: FastifyRequest<{
				Querystring: { from?: string; to?: string; category?: string; limit?: string };
			}>
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const { from, to, category } = request.query;
			const limit = Math.min(parseInt(request.query.limit ?? '200', 10) || 200, 500);
			const { f, t } = parseDateRange(from, to);

			const expenses = await prisma.expense.findMany({
				where: {
					tenantId,
					type: 'expense',
					date: { gte: f, lte: t },
					...(category ? { category } : {}),
				},
				orderBy: { date: 'desc' },
				take: limit,
			});
			const total = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0);
			return { expenses, total, count: expenses.length };
		}
	);

	// ── POST /api/v1/expenses ─────────────────────────────────────────────────
	fastify.post(
		'/api/v1/expenses',
		{
			schema: {
				body: {
					type: 'object',
					required: ['category', 'amount'],
					properties: {
						category: { type: 'string', minLength: 1 },
						amount: { type: 'number', minimum: 0.01 },
						note: { type: 'string' },
						vendor: { type: 'string' },
						date: { type: 'string' },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { category: string; amount: number; note?: string; vendor?: string; date?: string };
			}>,
			reply
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const { category, amount, note, vendor, date } = request.body;
			const expense = await prisma.expense.create({
				data: {
					tenantId,
					type: 'expense',
					category,
					amount: new Decimal(amount),
					note: note || null,
					vendor: vendor || null,
					date: date ? new Date(date) : new Date(),
				},
			});
			return reply.code(201).send({ expense });
		}
	);

	// ── DELETE /api/v1/expenses/:id ───────────────────────────────────────────
	fastify.delete<{ Params: { id: string } }>('/api/v1/expenses/:id', async (request, reply) => {
		const tenantId = (request as any).user!.tenantId as string;
		const row = await prisma.expense.findFirst({ where: { id: request.params.id, tenantId } });
		if (!row) return reply.code(404).send({ error: 'Not found' });
		await prisma.expense.delete({ where: { id: row.id } });
		return { ok: true };
	});

	// ── GET /api/v1/expenses/summary ──────────────────────────────────────────
	fastify.get(
		'/api/v1/expenses/summary',
		async (
			request: FastifyRequest<{
				Querystring: { from?: string; to?: string };
			}>
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const { from, to } = request.query;
			const { f, t } = parseDateRange(from, to);

			const rows = await prisma.expense.findMany({
				where: { tenantId, type: 'expense', date: { gte: f, lte: t } },
				select: { category: true, amount: true },
			});

			const byCategory: Record<string, number> = {};
			let total = 0;
			for (const r of rows) {
				const amt = parseFloat(String(r.amount));
				byCategory[r.category] = (byCategory[r.category] ?? 0) + amt;
				total += amt;
			}
			return { total, byCategory, count: rows.length };
		}
	);

	// ── GET /api/v1/purchases ─────────────────────────────────────────────────
	fastify.get(
		'/api/v1/purchases',
		async (
			request: FastifyRequest<{
				Querystring: { from?: string; to?: string; limit?: string };
			}>
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const limit = Math.min(parseInt(request.query.limit ?? '200', 10) || 200, 500);
			const { f, t } = parseDateRange(request.query.from, request.query.to);

			const purchases = await prisma.expense.findMany({
				where: { tenantId, type: 'purchase', date: { gte: f, lte: t } },
				orderBy: { date: 'desc' },
				take: limit,
			});
			const total = purchases.reduce((s, p) => s + parseFloat(String(p.amount)), 0);
			return { purchases, total, count: purchases.length };
		}
	);

	// ── POST /api/v1/purchases ────────────────────────────────────────────────
	fastify.post(
		'/api/v1/purchases',
		{
			schema: {
				body: {
					type: 'object',
					required: ['category', 'amount', 'itemName'],
					properties: {
						category: { type: 'string', minLength: 1 },
						amount: { type: 'number', minimum: 0.01 },
						itemName: { type: 'string', minLength: 1 },
						vendor: { type: 'string' },
						quantity: { type: 'number', minimum: 0 },
						unit: { type: 'string' },
						ratePerUnit: { type: 'number', minimum: 0 },
						note: { type: 'string' },
						date: { type: 'string' },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					category: string;
					amount: number;
					itemName: string;
					vendor?: string;
					quantity?: number;
					unit?: string;
					ratePerUnit?: number;
					note?: string;
					date?: string;
				};
			}>,
			reply
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const { category, amount, itemName, vendor, quantity, unit, ratePerUnit, note, date } = request.body;
			const purchase = await prisma.expense.create({
				data: {
					tenantId,
					type: 'purchase',
					category,
					amount: new Decimal(amount),
					itemName: itemName || null,
					vendor: vendor || null,
					quantity: quantity != null ? new Decimal(quantity) : null,
					unit: unit || null,
					ratePerUnit: ratePerUnit != null ? new Decimal(ratePerUnit) : null,
					note: note || null,
					date: date ? new Date(date) : new Date(),
				},
			});
			return reply.code(201).send({ purchase });
		}
	);

	// ── DELETE /api/v1/purchases/:id ──────────────────────────────────────────
	fastify.delete<{ Params: { id: string } }>('/api/v1/purchases/:id', async (request, reply) => {
		const tenantId = (request as any).user!.tenantId as string;
		const row = await prisma.expense.findFirst({ where: { id: request.params.id, tenantId, type: 'purchase' } });
		if (!row) return reply.code(404).send({ error: 'Not found' });
		await prisma.expense.delete({ where: { id: row.id } });
		return { ok: true };
	});

	// ── GET /api/v1/cashbook ─────────────────────────────────────────────────
	// Derives a running cash ledger from: payments (cash IN) + expenses (cash OUT)
	fastify.get(
		'/api/v1/cashbook',
		async (
			request: FastifyRequest<{
				Querystring: { from?: string; to?: string };
			}>
		) => {
			const tenantId = (request as any).user!.tenantId as string;
			const { f, t } = parseDateRange(request.query.from, request.query.to);

			const [payments, expenses] = await Promise.all([
				prisma.payment.findMany({
					where: { tenantId, receivedAt: { gte: f, lte: t } },
					include: { customer: { select: { name: true } } },
					orderBy: { receivedAt: 'desc' },
				}),
				prisma.expense.findMany({
					where: { tenantId, date: { gte: f, lte: t } },
					orderBy: { date: 'desc' },
				}),
			]);

			const inEntries = payments.map((p) => ({
				id: `pay-${p.id}`,
				type: 'in' as const,
				amount: parseFloat(String(p.amount)),
				category:
					p.method === 'cash'
						? 'Cash Receipt'
						: p.method === 'upi'
							? 'UPI Receipt'
							: 'Bank Receipt',
				note: p.customer?.name ? `Payment from ${p.customer.name}` : 'Payment received',
				date: p.receivedAt.toISOString().slice(0, 10),
				createdAt: p.receivedAt.getTime(),
			}));

			const outEntries = expenses.map((e) => ({
				id: `exp-${e.id}`,
				type: 'out' as const,
				amount: parseFloat(String(e.amount)),
				category: e.type === 'purchase' ? `Purchase: ${e.category}` : e.category,
				note: e.note || e.vendor || e.itemName || '',
				date: new Date(e.date).toISOString().slice(0, 10),
				createdAt: e.createdAt.getTime(),
			}));

			const combined = [...inEntries, ...outEntries].sort((a, b) => b.createdAt - a.createdAt);
			const totalIn = inEntries.reduce((s, e) => s + e.amount, 0);
			const totalOut = outEntries.reduce((s, e) => s + e.amount, 0);

			return {
				entries: combined.slice(0, 300),
				totalIn,
				totalOut,
				balance: totalIn - totalOut,
			};
		}
	);
}
