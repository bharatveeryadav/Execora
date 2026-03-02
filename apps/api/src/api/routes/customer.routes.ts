import { FastifyInstance, FastifyRequest } from 'fastify';
import { customerService, invoiceService } from '@execora/modules';

export async function customerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/customers/search', async (request: FastifyRequest<{
    Querystring: { q?: string; limit?: string };
  }>) => {
    const q = request.query.q ?? '';
    const customers = await customerService.searchCustomer(q);
    return { customers };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/customers/:id', async (request, reply) => {
    const customer = await customerService.getCustomerById(request.params.id);
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });
    return { customer };
  });

  // ── GET /api/v1/customers/:id/invoices ─────────────────────────────────────
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/v1/customers/:id/invoices',
    async (request) => {
      const limit = Math.min(parseInt(request.query.limit ?? '50', 10) || 50, 200);
      const invoices = await invoiceService.getCustomerInvoices(request.params.id, limit);
      return { invoices };
    }
  );

  fastify.post('/api/v1/customers', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name:     { type: 'string', minLength: 1, maxLength: 255 },
          phone:    { type: 'string', maxLength: 20 },
          nickname: { type: 'string', maxLength: 100 },
          landmark: { type: 'string', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { name: string; phone?: string; nickname?: string; landmark?: string };
  }>, reply) => {
    const customer = await customerService.createCustomer(request.body);
    return reply.code(201).send({ customer });
  });
}
