import { FastifyInstance, FastifyRequest } from 'fastify';
import { reminderService } from '@execora/modules';

export async function reminderRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/reminders', async (request: FastifyRequest<{
    Querystring: { customerId?: string };
  }>) => {
    const reminders = await reminderService.getPendingReminders(request.query.customerId);
    return { reminders };
  });

  fastify.post('/api/v1/reminders', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'amount', 'datetime'],
        properties: {
          customerId: { type: 'string', minLength: 1 },
          amount:     { type: 'number', exclusiveMinimum: 0 },
          datetime:   { type: 'string', minLength: 1 },
          message:    { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { customerId: string; amount: number; datetime: string; message?: string };
  }>, reply) => {
    const reminder = await reminderService.scheduleReminder(request.body.customerId, request.body.amount, request.body.datetime, request.body.message);
    return reply.code(201).send({ reminder });
  });

  fastify.post('/api/v1/reminders/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>) => {
    const reminder = await reminderService.cancelReminder(request.params.id);
    return { reminder };
  });
}
