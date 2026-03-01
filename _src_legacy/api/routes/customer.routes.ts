import { FastifyInstance, FastifyRequest } from 'fastify';
import { customerService } from '../../modules/customer/customer.service';

export async function customerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/customers/search', async (request: FastifyRequest<{
    Querystring: { q: string };
  }>) => {
    const customers = await customerService.searchCustomer(request.query.q);
    return { customers };
  });

  fastify.get('/api/v1/customers/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const customer = await customerService.getCustomerById(request.params.id);
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });
    return { customer };
  });

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
