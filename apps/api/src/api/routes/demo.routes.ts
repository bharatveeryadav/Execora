/**
 * Demo invoice routes — public, no auth.
 * Serves 14+ industry-level demo data for template previews.
 *
 * GET /api/v1/demo-invoices     — invoice demos
 * GET /api/v1/demo-purchases    — purchase demos
 * GET /api/v1/demo-quotations   — quotation demos
 */
import { FastifyInstance } from 'fastify';
import {
  DEMO_INVOICES,
  DEMO_PURCHASES,
  DEMO_QUOTATIONS,
} from '@execora/shared';

export async function demoRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/demo-invoices', async (_request, reply) => {
    return reply.send({ demos: DEMO_INVOICES });
  });

  fastify.get('/api/v1/demo-purchases', async (_request, reply) => {
    return reply.send({ demos: DEMO_PURCHASES });
  });

  fastify.get('/api/v1/demo-quotations', async (_request, reply) => {
    return reply.send({ demos: DEMO_QUOTATIONS });
  });
}
