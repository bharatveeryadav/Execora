import { FastifyInstance } from 'fastify';
import { invoiceService } from '@execora/modules';

export async function summaryRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/summary/daily', async () => {
    const summary = await invoiceService.getDailySummary();
    return { summary };
  });
}
