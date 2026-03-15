import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { Prisma } from '@prisma/client';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
	const n = parseInt(String(raw ?? defaultVal), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

/** Generate CN/YYYY-YY/SEQ number */
async function generateCreditNoteNo(tenantId: string): Promise<string> {
	const now = new Date();
	const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
	const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;

	const last = await prisma.creditNote.findFirst({
		where: { tenantId, creditNoteNo: { startsWith: `CN/${fyLabel}/` } },
		orderBy: { createdAt: 'desc' },
		select: { creditNoteNo: true },
	});

	let seq = 1;
	if (last) {
		const parts = last.creditNoteNo.split('/');
		seq = parseInt(parts[parts.length - 1], 10) + 1;
	}
	return `CN/${fyLabel}/${seq}`;
}

export async function creditNoteRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/credit-notes ─────────────────────────────────────────────
	fastify.get(
		'/api/v1/credit-notes',
		async (
			request: FastifyRequest<{
				Querystring: { limit?: string; customerId?: string; invoiceId?: string; status?: string };
			}>
		) => {
			const { tenantId } = request.user!;
			const limit = parseLimit(request.query.limit, 20);
			const where: Prisma.CreditNoteWhereInput = {
				tenantId,
				deletedAt: null,
			};
			if (request.query.customerId) where.customerId = request.query.customerId;
			if (request.query.invoiceId) where.invoiceId = request.query.invoiceId;
			if (request.query.status) where.status = request.query.status as any;

			const creditNotes = await prisma.creditNote.findMany({
				where,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: {
					customer: { select: { id: true, name: true, phone: true } },
					invoice:  { select: { id: true, invoiceNo: true } },
					items:    true,
				},
			});
			return { creditNotes };
		}
	);

	// ── GET /api/v1/credit-notes/:id ──────────────────────────────────────────
	fastify.get<{ Params: { id: string } }>(
		'/api/v1/credit-notes/:id',
		async (request, reply) => {
			const { tenantId } = request.user!;
			const cn = await prisma.creditNote.findFirst({
				where: { id: request.params.id, tenantId, deletedAt: null },
				include: {
					customer: true,
					invoice:  { select: { id: true, invoiceNo: true, invoiceDate: true } },
					items:    { include: { product: { select: { id: true, name: true, sku: true } } } },
				},
			});
			if (!cn) return reply.code(404).send({ error: 'Credit note not found' });
			return { creditNote: cn };
		}
	);

	// ── POST /api/v1/credit-notes — create draft ──────────────────────────────
	fastify.post(
		'/api/v1/credit-notes',
		{
			schema: {
				body: {
					type: 'object',
					required: ['items'],
					properties: {
						invoiceId:    { type: 'string' },
						customerId:   { type: 'string' },
						reason:       { type: 'string', enum: ['goods_returned', 'price_adjustment', 'discount', 'damaged_goods', 'short_supply', 'other'] },
						reasonNote:   { type: 'string', maxLength: 500 },
						notes:        { type: 'string', maxLength: 1000 },
						placeOfSupply:{ type: 'string', maxLength: 50 },
						buyerGstin:   { type: 'string', maxLength: 15 },
						reverseCharge:{ type: 'boolean' },
						items: {
							type: 'array',
							minItems: 1,
							items: {
								type: 'object',
								required: ['productName', 'quantity', 'unitPrice'],
								properties: {
									productId:   { type: 'string' },
									productName: { type: 'string', minLength: 1, maxLength: 255 },
									quantity:    { type: 'number', minimum: 0.001 },
									unit:        { type: 'string', maxLength: 20 },
									unitPrice:   { type: 'number', minimum: 0 },
									discount:    { type: 'number', minimum: 0, maximum: 100 },
									hsnCode:     { type: 'string', maxLength: 8 },
									gstRate:     { type: 'number', minimum: 0, maximum: 28 },
								},
								additionalProperties: false,
							},
						},
					},
					additionalProperties: false,
				},
			},
		},
		async (request: FastifyRequest<{ Body: {
			invoiceId?: string; customerId?: string;
			reason?: string; reasonNote?: string; notes?: string;
			placeOfSupply?: string; buyerGstin?: string; reverseCharge?: boolean;
			items: {
				productId?: string; productName: string;
				quantity: number; unit?: string; unitPrice: number;
				discount?: number; hsnCode?: string; gstRate?: number;
			}[];
		} }>, reply) => {
			const { tenantId, userId } = request.user!;
			const body = request.body;

			// If invoiceId provided, verify it belongs to this tenant
			if (body.invoiceId) {
				const inv = await prisma.invoice.findFirst({ where: { id: body.invoiceId, tenantId } });
				if (!inv) return reply.code(404).send({ error: 'Invoice not found' });
			}
			if (body.customerId) {
				const cust = await prisma.customer.findFirst({ where: { id: body.customerId, tenantId } });
				if (!cust) return reply.code(404).send({ error: 'Customer not found' });
			}

			// Compute line totals
			const lineItems = body.items.map((item) => {
				const gstRate = item.gstRate ?? 0;
				const discountAmt = (item.unitPrice * item.quantity) * ((item.discount ?? 0) / 100);
				const subtotal = item.unitPrice * item.quantity - discountAmt;
				const taxAmt = subtotal * (gstRate / 100);
				const total = subtotal + taxAmt;
				// CGST/SGST split (intrastate default; IGST if interstate detected via buyerGstin prefix ≠ placeOfSupply)
				const isIgst = body.placeOfSupply && body.buyerGstin
					? body.buyerGstin.slice(0, 2) !== body.placeOfSupply.slice(0, 2)
					: false;
				return {
					productId: item.productId,
					productName: item.productName,
					quantity: new Prisma.Decimal(item.quantity),
					unit: item.unit ?? 'pcs',
					unitPrice: new Prisma.Decimal(item.unitPrice),
					discount: new Prisma.Decimal(discountAmt),
					subtotal: new Prisma.Decimal(subtotal),
					tax: new Prisma.Decimal(taxAmt),
					cgst: isIgst ? new Prisma.Decimal(0) : new Prisma.Decimal(taxAmt / 2),
					sgst: isIgst ? new Prisma.Decimal(0) : new Prisma.Decimal(taxAmt / 2),
					igst: isIgst ? new Prisma.Decimal(taxAmt) : new Prisma.Decimal(0),
					total: new Prisma.Decimal(total),
					hsnCode: item.hsnCode,
					gstRate: new Prisma.Decimal(gstRate),
				};
			});

			const subtotal = lineItems.reduce((s, i) => s + Number(i.subtotal), 0);
			const tax      = lineItems.reduce((s, i) => s + Number(i.tax), 0);
			const cgst     = lineItems.reduce((s, i) => s + Number(i.cgst), 0);
			const sgst     = lineItems.reduce((s, i) => s + Number(i.sgst), 0);
			const igst     = lineItems.reduce((s, i) => s + Number(i.igst), 0);
			const total    = subtotal + tax;

			const creditNoteNo = await generateCreditNoteNo(tenantId);

			const cn = await prisma.creditNote.create({
				data: {
					tenantId,
					creditNoteNo,
					invoiceId:     body.invoiceId,
					customerId:    body.customerId,
					reason:        (body.reason ?? 'goods_returned') as any,
					reasonNote:    body.reasonNote,
					notes:         body.notes,
					placeOfSupply: body.placeOfSupply,
					buyerGstin:    body.buyerGstin,
					reverseCharge: body.reverseCharge ?? false,
					status:        'draft',
					subtotal:      new Prisma.Decimal(subtotal),
					tax:           new Prisma.Decimal(tax),
					cgst:          new Prisma.Decimal(cgst),
					sgst:          new Prisma.Decimal(sgst),
					igst:          new Prisma.Decimal(igst),
					total:         new Prisma.Decimal(total),
					createdBy:     userId,
					items: { create: lineItems },
				},
				include: { items: true, customer: { select: { id: true, name: true } } },
			});

			return reply.code(201).send({ creditNote: cn });
		}
	);

	// ── POST /api/v1/credit-notes/:id/issue — mark as issued ─────────────────
	fastify.post<{ Params: { id: string } }>(
		'/api/v1/credit-notes/:id/issue',
		async (request, reply) => {
			const { tenantId } = request.user!;
			const cn = await prisma.creditNote.findFirst({
				where: { id: request.params.id, tenantId, deletedAt: null },
			});
			if (!cn) return reply.code(404).send({ error: 'Credit note not found' });
			if (cn.status !== 'draft') return reply.code(400).send({ error: `Cannot issue a credit note in status: ${cn.status}` });

			const updated = await prisma.creditNote.update({
				where: { id: cn.id },
				data: { status: 'issued', issuedAt: new Date() },
			});
			return { creditNote: updated };
		}
	);

	// ── POST /api/v1/credit-notes/:id/cancel — cancel issued CN ─────────────
	fastify.post(
		'/api/v1/credit-notes/:id/cancel',
		{
			schema: {
				body: {
					type: 'object',
					properties: { reason: { type: 'string', maxLength: 500 } },
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
			reply
		) => {
			const { tenantId } = request.user!;
			const cn = await prisma.creditNote.findFirst({
				where: { id: request.params.id, tenantId, deletedAt: null },
			});
			if (!cn) return reply.code(404).send({ error: 'Credit note not found' });
			if (cn.status === 'cancelled') return reply.code(400).send({ error: 'Already cancelled' });

			const updated = await prisma.creditNote.update({
				where: { id: cn.id },
				data: {
					status: 'cancelled',
					cancelledAt: new Date(),
					cancelledReason: request.body.reason,
				},
			});
			return { creditNote: updated };
		}
	);

	// ── DELETE /api/v1/credit-notes/:id — soft delete draft ──────────────────
	fastify.delete<{ Params: { id: string } }>(
		'/api/v1/credit-notes/:id',
		async (request, reply) => {
			const { tenantId } = request.user!;
			const cn = await prisma.creditNote.findFirst({
				where: { id: request.params.id, tenantId, deletedAt: null },
			});
			if (!cn) return reply.code(404).send({ error: 'Credit note not found' });
			if (cn.status === 'issued') return reply.code(400).send({ error: 'Cannot delete an issued credit note — cancel it first' });

			await prisma.creditNote.update({
				where: { id: cn.id },
				data: { deletedAt: new Date() },
			});
			return reply.code(204).send();
		}
	);
}
