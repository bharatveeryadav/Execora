/**
 * Audit log routes — immutable activity trail queries
 *
 * GET /api/v1/audit              — query audit log (?entity=&userId=&from=&to=&limit=)
 * GET /api/v1/audit/activity     — recent activity summary for dashboard
 *
 * Requires owner or admin role.
 * All routes require JWT auth (inherited from parent scope).
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/core';
import { requireRole } from '../middleware/require-role';

export async function auditRoutes(fastify: FastifyInstance) {
	// ── GET /api/v1/audit ─────────────────────────────────────────────────────
	fastify.get<{
		Querystring: {
			entity?: string;
			userId?: string;
			from?: string;
			to?: string;
			limit?: string;
		};
	}>(
		'/api/v1/audit',
		{ preHandler: requireRole(['owner', 'admin']) },
		async (request, reply) => {
			const tenantId = request.user!.tenantId;
			const limit = Math.min(parseInt(String(request.query.limit ?? 100), 10) || 100, 500);
			const where: Record<string, unknown> = { tenantId };
			if (request.query.entity) where.entityType = request.query.entity;
			if (request.query.userId) where.userId = request.query.userId;
			if (request.query.from || request.query.to) {
				const createdAt: Record<string, Date> = {};
				if (request.query.from) {
					const d = new Date(request.query.from);
					if (isNaN(d.getTime())) return reply.code(400).send({ error: 'Invalid from date' });
					createdAt.gte = d;
				}
				if (request.query.to) {
					const d = new Date(request.query.to);
					if (isNaN(d.getTime())) return reply.code(400).send({ error: 'Invalid to date' });
					createdAt.lte = d;
				}
				where.createdAt = createdAt;
			}
			const entries = await prisma.activityLog.findMany({
				where: where as any,
				orderBy: { createdAt: 'desc' },
				take: limit,
				select: { id: true, userId: true, action: true, entityType: true, entityId: true, details: true, createdAt: true },
			});
			return { entries, count: entries.length };
		},
	);

	// ── GET /api/v1/audit/activity ────────────────────────────────────────────
	// Recent activity summary using ActivityLog (existing Prisma model).
	fastify.get<{ Querystring: { limit?: string } }>(
		'/api/v1/audit/activity',
		{ preHandler: requireRole(['owner', 'admin', 'manager']) },
		async (request) => {
			const tenantId = request.user!.tenantId;
			const limit = Math.min(parseInt(String(request.query.limit ?? 50), 10) || 50, 200);
			const logs = await prisma.activityLog.findMany({
				where: { tenantId },
				orderBy: { createdAt: 'desc' },
				take: limit,
				select: {
					id: true,
					userId: true,
					action: true,
					entityType: true,
					entityId: true,
					details: true,
					createdAt: true,
				},
			});
			return { logs, count: logs.length };
		},
	);
}
