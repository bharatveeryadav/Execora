import { FastifyInstance, FastifyRequest } from 'fastify';
import { invoiceService, ledgerService } from '@execora/modules';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/invoices ──────────────────────────────────────────────────
  fastify.get('/api/v1/invoices', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>) => {
    const invoices = await invoiceService.getRecentInvoices(parseLimit(request.query.limit, 20));
    return { invoices };
  });

  // ── GET /api/v1/invoices/:id ──────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/v1/invoices/:id', async (request, reply) => {
    const invoice = await invoiceService.getInvoiceById(request.params.id);
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });
    return { invoice };
  });

  // ── POST /api/v1/invoices — create regular invoice ────────────────────────
  fastify.post('/api/v1/invoices', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId:      { type: 'string', minLength: 1 },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productName', 'quantity'],
              properties: {
                productName: { type: 'string', minLength: 1, maxLength: 255 },
                quantity:    { type: 'integer', minimum: 1 },
              },
              additionalProperties: false,
            },
          },
          notes:           { type: 'string', maxLength: 1000 },
          // Discount
          discountPercent: { type: 'number', minimum: 0, maximum: 100 },
          discountAmount:  { type: 'number', minimum: 0 },
          // GST
          withGst:         { type: 'boolean' },
          supplyType:      { type: 'string', enum: ['INTRASTATE', 'INTERSTATE'] },
          // B2B
          buyerGstin:      { type: 'string', maxLength: 15 },
          placeOfSupply:   { type: 'string', maxLength: 2 },
          // Partial payment at billing
          initialPayment: {
            type: 'object',
            required: ['amount', 'method'],
            properties: {
              amount: { type: 'number', minimum: 0.01 },
              method: { type: 'string', enum: ['cash', 'upi', 'card', 'other'] },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      items: Array<{ productName: string; quantity: number }>;
      notes?: string;
      discountPercent?: number;
      discountAmount?: number;
      withGst?: boolean;
      supplyType?: 'INTRASTATE' | 'INTERSTATE';
      buyerGstin?: string;
      placeOfSupply?: string;
      initialPayment?: { amount: number; method: 'cash' | 'upi' | 'card' | 'other' };
    };
  }>, reply) => {
    const { customerId, items, notes, ...opts } = request.body;
    const result = await invoiceService.createInvoice(customerId, items, notes, opts);
    return reply.code(201).send({ invoice: result.invoice, autoCreatedProducts: result.autoCreatedProducts });
  });

  // ── POST /api/v1/invoices/proforma — create proforma / quotation ──────────
  fastify.post('/api/v1/invoices/proforma', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId:      { type: 'string', minLength: 1 },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productName', 'quantity'],
              properties: {
                productName: { type: 'string', minLength: 1, maxLength: 255 },
                quantity:    { type: 'integer', minimum: 1 },
              },
              additionalProperties: false,
            },
          },
          notes:           { type: 'string', maxLength: 1000 },
          discountPercent: { type: 'number', minimum: 0, maximum: 100 },
          discountAmount:  { type: 'number', minimum: 0 },
          withGst:         { type: 'boolean' },
          supplyType:      { type: 'string', enum: ['INTRASTATE', 'INTERSTATE'] },
          buyerGstin:      { type: 'string', maxLength: 15 },
          placeOfSupply:   { type: 'string', maxLength: 2 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      items: Array<{ productName: string; quantity: number }>;
      notes?: string;
      discountPercent?: number;
      discountAmount?: number;
      withGst?: boolean;
      supplyType?: 'INTRASTATE' | 'INTERSTATE';
      buyerGstin?: string;
      placeOfSupply?: string;
    };
  }>, reply) => {
    const { customerId, items, notes, ...opts } = request.body;
    const result = await invoiceService.createInvoice(customerId, items, notes, { ...opts, isProforma: true });
    return reply.code(201).send({ invoice: result.invoice });
  });

  // ── POST /api/v1/invoices/:id/convert — proforma → invoice ───────────────
  fastify.post<{ Params: { id: string }; Body: { amount?: number; method?: string } }>(
    '/api/v1/invoices/:id/convert',
    async (request, reply) => {
      const initialPayment = request.body?.amount
        ? { amount: request.body.amount, method: (request.body.method ?? 'cash') as 'cash' | 'upi' | 'card' | 'other' }
        : undefined;
      const invoice = await invoiceService.convertProformaToInvoice(request.params.id, initialPayment);
      return { invoice };
    }
  );

  // ── PATCH /api/v1/invoices/:id — edit pending invoice ────────────────────
  fastify.patch('/api/v1/invoices/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productName', 'quantity'],
              properties: {
                productName: { type: 'string', minLength: 1, maxLength: 255 },
                quantity:    { type: 'integer', minimum: 1 },
              },
              additionalProperties: false,
            },
          },
          notes:           { type: 'string', maxLength: 1000 },
          discountPercent: { type: 'number', minimum: 0, maximum: 100 },
          discountAmount:  { type: 'number', minimum: 0 },
          withGst:         { type: 'boolean' },
          supplyType:      { type: 'string', enum: ['INTRASTATE', 'INTERSTATE'] },
          buyerGstin:      { type: 'string', maxLength: 15 },
          placeOfSupply:   { type: 'string', maxLength: 2 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      items?: Array<{ productName: string; quantity: number }>;
      notes?: string;
      discountPercent?: number;
      discountAmount?: number;
      withGst?: boolean;
      supplyType?: 'INTRASTATE' | 'INTERSTATE';
      buyerGstin?: string;
      placeOfSupply?: string;
    };
  }>, reply) => {
    const { items, notes, ...optsRaw } = request.body;
    const invoice = await invoiceService.updateInvoice(request.params.id, { items, notes, opts: optsRaw });
    return { invoice };
  });

  // ── POST /api/v1/invoices/:id/cancel ─────────────────────────────────────
  fastify.post('/api/v1/invoices/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const invoice = await invoiceService.cancelInvoice(request.params.id);
    return { invoice };
  });

  // ── POST /api/v1/ledger/mixed-payment — cash+UPI split payment ────────────
  fastify.post('/api/v1/ledger/mixed-payment', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'splits'],
        properties: {
          customerId: { type: 'string', minLength: 1 },
          splits: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              required: ['amount', 'method'],
              properties: {
                amount: { type: 'number', minimum: 0.01 },
                method: { type: 'string', enum: ['cash', 'upi', 'card', 'other'] },
              },
              additionalProperties: false,
            },
          },
          notes: { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      splits: Array<{ amount: number; method: 'cash' | 'upi' | 'card' | 'other' }>;
      notes?: string;
    };
  }>, reply) => {
    const result = await ledgerService.recordMixedPayment(
      request.body.customerId,
      request.body.splits,
      request.body.notes
    );
    return reply.code(201).send(result);
  });
}
