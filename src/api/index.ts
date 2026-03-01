import { FastifyInstance } from 'fastify';
import { prisma } from '../infrastructure/database';
import { checkRedisHealth, reminderQueue, whatsappQueue, mediaQueue } from '../infrastructure/queue';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

import { customerRoutes } from './routes/customer.routes';
import { productRoutes } from './routes/product.routes';
import { invoiceRoutes } from './routes/invoice.routes';
import { ledgerRoutes } from './routes/ledger.routes';
import { reminderRoutes } from './routes/reminder.routes';
import { sessionRoutes } from './routes/session.routes';
import { summaryRoutes } from './routes/summary.routes';
import { webhookRoutes } from './routes/webhook.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  // ── BullMQ queue dashboard — http://localhost:3000/admin/queues ──────────
  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: [
      new BullMQAdapter(reminderQueue) as any,
      new BullMQAdapter(whatsappQueue) as any,
      new BullMQAdapter(mediaQueue) as any,
    ],
    serverAdapter,
  });
  serverAdapter.setBasePath('/admin/queues');
  await fastify.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues', basePath: '/admin/queues' });

  // ── Custom legacy APIs (require-style to avoid circular-import issues) ────
  const customerBalancesApi = require('./customer-balances').default;
  await customerBalancesApi(fastify);

  const customerTotalPendingApi = require('./customer-total-pending').default;
  await customerTotalPendingApi(fastify);

  // ── Health check ──────────────────────────────────────────────────────────
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};
    try { await prisma.$queryRaw`SELECT 1`; checks.database = 'ok'; }
    catch { checks.database = 'error'; }
    checks.redis = (await checkRedisHealth()) ? 'ok' : 'error';
    const allOk = Object.values(checks).every((s) => s === 'ok');
    return reply.code(allOk ? 200 : 503).send({ status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString(), version: process.env.npm_package_version ?? '1.0.0' });
  });

  // Suppress noisy Chrome DevTools 404 probes
  fastify.get('/.well-known/appspecific/com.chrome.devtools.json', async (_request, reply) => reply.code(204).send());

  // ── Domain route modules ──────────────────────────────────────────────────
  await fastify.register(customerRoutes);
  await fastify.register(productRoutes);
  await fastify.register(invoiceRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(reminderRoutes);
  await fastify.register(sessionRoutes);
  await fastify.register(summaryRoutes);
  await fastify.register(webhookRoutes);
}
