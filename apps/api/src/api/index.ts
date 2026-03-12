import { FastifyInstance } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { checkRedisHealth, reminderQueue, whatsappQueue, mediaQueue, ocrJobQueue } from '@execora/infrastructure';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

import { adminAuthPreHandler } from './middleware/admin-auth';
import { requireAuth } from './middleware/require-auth';
import { customerRoutes } from './routes/customer.routes';
import { productRoutes } from './routes/product.routes';
import { invoiceRoutes } from './routes/invoice.routes';
import { ledgerRoutes } from './routes/ledger.routes';
import { reminderRoutes } from './routes/reminder.routes';
import { sessionRoutes } from './routes/session.routes';
import { summaryRoutes } from './routes/summary.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { adminRoutes } from './routes/admin.routes';
import { authRoutes } from './routes/auth.routes';
import { usersRoutes } from './routes/users.routes';
import { reportRoutes } from './routes/report.routes';
import { expenseRoutes } from './routes/expense.routes';
import { aiRoutes } from './routes/ai.routes';
import { draftRoutes } from './routes/draft.routes';
import { portalRoutes } from './routes/portal.routes';

export async function registerRoutes(fastify: FastifyInstance) {
	// ── BullMQ queue dashboard (/admin/queues) — protected by admin key ──────
	// Registered in its own encapsulated scope so the auth hook only fires here.
	await fastify.register(async (scope: FastifyInstance) => {
		scope.addHook('onRequest', adminAuthPreHandler);
		const serverAdapter = new FastifyAdapter();
		createBullBoard({
			queues: [
				new BullMQAdapter(reminderQueue) as any,
				new BullMQAdapter(whatsappQueue) as any,
				new BullMQAdapter(mediaQueue) as any,
				new BullMQAdapter(ocrJobQueue) as any,
			],
			serverAdapter,
		});
		serverAdapter.setBasePath('/admin/queues');
		await scope.register(serverAdapter.registerPlugin(), {
			prefix: '/admin/queues',
			basePath: '/admin/queues',
		});
	});

	// ── Health check (public — used by load balancers) ───────────────────────
	fastify.get('/health', async (_request, reply) => {
		const checks: Record<string, 'ok' | 'error'> = {};
		try {
			await prisma.$queryRaw`SELECT 1`;
			checks.database = 'ok';
		} catch {
			checks.database = 'error';
		}
		checks.redis = (await checkRedisHealth()) ? 'ok' : 'error';
		const allOk = Object.values(checks).every((s) => s === 'ok');
		return reply.code(allOk ? 200 : 503).send({
			status: allOk ? 'ok' : 'degraded',
			checks,
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version ?? '1.0.0',
		});
	});

	// Suppress noisy Chrome DevTools 404 probes
	fastify.get('/.well-known/appspecific/com.chrome.devtools.json', async (_r, reply) => reply.code(204).send());

	// ── Public routes (no JWT required) ──────────────────────────────────────
	await fastify.register(authRoutes);   // POST /api/v1/auth/login|refresh|logout|hash
	await fastify.register(webhookRoutes); // POST /webhooks/*
	await fastify.register(portalRoutes); // GET /pub/invoice/:id/:token

	// ── Protected routes (JWT required) ───────────────────────────────────────
	// All routes registered inside this scope inherit the requireAuth preHandler.
	// Fastify encapsulation ensures the hook is scoped only to these routes.
	await fastify.register(async (scope: FastifyInstance) => {
		scope.addHook('preHandler', requireAuth);

		await scope.register(customerRoutes);
		await scope.register(productRoutes);
		await scope.register(invoiceRoutes);
		await scope.register(ledgerRoutes);
		await scope.register(reminderRoutes);
		await scope.register(sessionRoutes);
		await scope.register(summaryRoutes);
		await scope.register(usersRoutes);
		await scope.register(reportRoutes);
		await scope.register(expenseRoutes);
		await scope.register(aiRoutes); // Sprint 2 AI features
		await scope.register(draftRoutes); // Draft/Staging system
	});

	// ── Admin routes (platform-level, auth enforced inside via hook) ─────────
	await fastify.register(adminRoutes);
}
