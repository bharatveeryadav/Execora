import { FastifyInstance, FastifyRequest } from 'fastify';
import { invoiceService } from '@execora/modules';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/invoices', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>) => {
    const invoices = await invoiceService.getRecentInvoices(parseLimit(request.query.limit, 20));
    return { invoices };
  });

  fastify.post('/api/v1/invoices', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId: { type: 'string', minLength: 1 },
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
          notes: { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { customerId: string; items: Array<{ productName: string; quantity: number }>; notes?: string };
  }>, reply) => {
    const invoice = await invoiceService.createInvoice(request.body.customerId, request.body.items, request.body.notes);
    return reply.code(201).send({ invoice });
  });

  fastify.post('/api/v1/invoices/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const invoice = await invoiceService.cancelInvoice(request.params.id);
    return { invoice };
  });
}
