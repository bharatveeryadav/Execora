/**
 * Credit Note Routes — /api/v1/credit-notes
 *
 * Credit notes adjust or reverse invoiced amounts.
 * Status lifecycle: draft → issued | cancelled
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import {
listCreditNotes,
getCreditNoteById,
createCreditNote,
issueCreditNote,
cancelCreditNote,
deleteCreditNote,
} from '@execora/modules';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
const n = parseInt(String(raw ?? defaultVal), 10);
return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
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
const creditNotes = await listCreditNotes(tenantId, {
limit,
customerId: request.query.customerId,
invoiceId: request.query.invoiceId,
status: request.query.status,
});
return { creditNotes };
}
);

// ── GET /api/v1/credit-notes/:id ────────────────────────────────────────
fastify.get<{ Params: { id: string } }>(
'/api/v1/credit-notes/:id',
async (request, reply) => {
const { tenantId } = request.user!;
const cn = await getCreditNoteById(tenantId, request.params.id);
if (!cn) return reply.code(404).send({ error: 'Credit note not found' });
return { creditNote: cn };
}
);

// ── POST /api/v1/credit-notes — create draft ────────────────────────────
fastify.post(
'/api/v1/credit-notes',
{
schema: {
body: {
type: 'object',
required: ['items'],
properties: {
invoiceId:     { type: 'string' },
customerId:    { type: 'string' },
reason:        { type: 'string', enum: ['goods_returned', 'price_adjustment', 'discount', 'damaged_goods', 'short_supply', 'other'] },
reasonNote:    { type: 'string', maxLength: 500 },
notes:         { type: 'string', maxLength: 1000 },
placeOfSupply: { type: 'string', maxLength: 50 },
buyerGstin:    { type: 'string', maxLength: 15 },
reverseCharge: { type: 'boolean' },
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
async (
request: FastifyRequest<{
Body: {
invoiceId?: string;
customerId?: string;
reason?: string;
reasonNote?: string;
notes?: string;
placeOfSupply?: string;
buyerGstin?: string;
reverseCharge?: boolean;
items: {
productId?: string;
productName: string;
quantity: number;
unit?: string;
unitPrice: number;
discount?: number;
hsnCode?: string;
gstRate?: number;
}[];
};
}>,
reply
) => {
const { tenantId, userId } = request.user!;
try {
const cn = await createCreditNote(tenantId, userId, request.body);
return reply.code(201).send({ creditNote: cn });
} catch (err: any) {
const is404 = /not found/i.test(err.message);
return reply.code(is404 ? 404 : 400).send({ error: err.message });
}
}
);

// ── POST /api/v1/credit-notes/:id/issue — mark as issued ────────────────
fastify.post<{ Params: { id: string } }>(
'/api/v1/credit-notes/:id/issue',
async (request, reply) => {
const { tenantId } = request.user!;
try {
const updated = await issueCreditNote(tenantId, request.params.id);
return { creditNote: updated };
} catch (err: any) {
const is404 = /not found/i.test(err.message);
return reply.code(is404 ? 404 : 400).send({ error: err.message });
}
}
);

// ── POST /api/v1/credit-notes/:id/cancel ────────────────────────────────
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
try {
const updated = await cancelCreditNote(tenantId, request.params.id, request.body.reason);
return { creditNote: updated };
} catch (err: any) {
const is404 = /not found/i.test(err.message);
return reply.code(is404 ? 404 : 400).send({ error: err.message });
}
}
);

// ── DELETE /api/v1/credit-notes/:id — soft delete draft ─────────────────
fastify.delete<{ Params: { id: string } }>(
'/api/v1/credit-notes/:id',
async (request, reply) => {
const { tenantId } = request.user!;
try {
await deleteCreditNote(tenantId, request.params.id);
return reply.code(204).send();
} catch (err: any) {
const is404 = /not found/i.test(err.message);
return reply.code(is404 ? 404 : 400).send({ error: err.message });
}
}
);
}
