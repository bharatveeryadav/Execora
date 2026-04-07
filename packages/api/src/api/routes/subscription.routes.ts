/**
 * Subscription & platform usage routes
 *
 * GET  /api/v1/subscription              — get tenant's current subscription
 * POST /api/v1/subscription/activate     — activate / upgrade subscription plan
 * POST /api/v1/subscription/cancel       — cancel subscription
 * GET  /api/v1/subscription/usage        — current usage vs plan quotas
 * GET  /api/v1/subscription/plans        — list available plans
 *
 * Only owner role can manage subscriptions.
 * All routes require JWT auth (inherited from parent scope).
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/core';
import { requireRole } from '../middleware/require-role';
import { TenantPlan } from '@prisma/client';

const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		currency: 'INR',
		limits: { invoicesPerMonth: 50, products: 100, users: 2, storageGb: 1 },
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 1999,
		currency: 'INR',
		limits: { invoicesPerMonth: 5000, products: 10000, users: 20, storageGb: 50 },
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: null,
		currency: 'INR',
		limits: { invoicesPerMonth: null, products: null, users: null, storageGb: null },
	},
];

export async function subscriptionRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/subscription ─────────────────────────────────────────────
	fastify.get(
		'/api/v1/subscription',
		async (request: FastifyRequest) => {
			const tenantId = request.user!.tenantId;
			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { plan: true, status: true, createdAt: true, trialEndsAt: true, subscriptionEndsAt: true },
			});
			return {
				subscription: {
					tenantId,
					plan: tenant?.plan ?? 'free',
					status: tenant?.status ?? 'trial',
					trialEndsAt: tenant?.trialEndsAt,
					subscriptionEndsAt: tenant?.subscriptionEndsAt,
					note: 'Subscription management system coming soon.',
				},
			};
		},
	);

	// ── POST /api/v1/subscription/activate ───────────────────────────────────
	fastify.post(
		'/api/v1/subscription/activate',
		{
			preHandler: requireRole(['owner']),
			schema: {
				body: {
					type: 'object',
					required: ['plan'],
					properties: {
						plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{ Body: { plan: 'free' | 'pro' | 'enterprise' } }>,
			reply,
		) => {
			const tenantId = request.user!.tenantId;
			// Sync plan to Tenant record
			const tenant = await prisma.tenant.update({
				where: { id: tenantId },
				data: { plan: request.body.plan as TenantPlan, status: 'active' as const },
				select: { plan: true, status: true },
			});
			const now = new Date();
			const end = new Date(now);
			end.setMonth(end.getMonth() + 1);
			return reply.code(200).send({
				subscription: {
					tenantId,
					plan: tenant.plan,
					status: tenant.status,
					currentPeriodStart: now.toISOString(),
					currentPeriodEnd: end.toISOString(),
				},
			});
		},
	);

	// ── POST /api/v1/subscription/cancel ─────────────────────────────────────
	fastify.post(
		'/api/v1/subscription/cancel',
		{
			preHandler: requireRole(['owner']),
			schema: {
				body: {
					type: 'object',
					properties: {
						atPeriodEnd: { type: 'boolean' },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{ Body: { atPeriodEnd?: boolean } }>,
			reply,
		) => {
			const tenantId = request.user!.tenantId;
			const atPeriodEnd = request.body.atPeriodEnd ?? true;
			if (!atPeriodEnd) {
				// Immediate cancel
				await prisma.tenant.update({
					where: { id: tenantId },
					data: { status: 'suspended' },
				});
			}
			return reply.code(200).send({ ok: true, tenantId, atPeriodEnd });
		},
	);

	// ── GET /api/v1/subscription/usage ───────────────────────────────────────
	// Current billing-period usage counts vs plan limits.
	fastify.get(
		'/api/v1/subscription/usage',
		async (request: FastifyRequest) => {
			const tenantId = request.user!.tenantId;
			const now = new Date();
			const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

			const [invoicesThisMonth, totalProducts, totalUsers] = await prisma.$transaction([
				prisma.invoice.count({
					where: {
						tenantId,
						createdAt: { gte: periodStart },
						status: { not: 'cancelled' },
					},
				}),
				prisma.product.count({ where: { tenantId, isActive: true } }),
				prisma.user.count({ where: { tenantId, isActive: true } }),
			]);

			const tenant = await prisma.tenant.findUnique({
				where: { id: tenantId },
				select: { plan: true },
			});
			const plan = PLANS.find((p) => p.id === (tenant?.plan ?? 'free')) ?? PLANS[0];

			return {
				period: periodStart.toISOString().slice(0, 7),
				plan: plan.id,
				usage: {
					invoicesThisMonth,
					totalProducts,
					totalUsers,
				},
				limits: plan.limits,
			};
		},
	);

	// ── GET /api/v1/subscription/plans ───────────────────────────────────────
	fastify.get('/api/v1/subscription/plans', async () => {
		return { plans: PLANS };
	});
}
