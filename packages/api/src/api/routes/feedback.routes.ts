/**
 * Feedback routes — NPS + text submission and retrieval.
 *
 * POST /api/v1/feedback         — submit NPS score (0-10) and optional text
 * GET  /api/v1/feedback         — list all feedback (admin/owner only)
 * GET  /api/v1/feedback/summary — NPS summary stats
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/core';
import { requireRole } from '../middleware/require-role';

export async function feedbackRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/v1/feedback',
		{
			schema: {
				body: {
					type: 'object',
					required: ['npsScore'],
					properties: {
						npsScore: { type: 'number', minimum: 0, maximum: 10 },
						text: { type: 'string', maxLength: 2000 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { npsScore: number; text?: string };
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const userId = request.user!.userId;
			const { npsScore, text } = request.body;

			const feedback = await prisma.feedback.create({
				data: {
					tenantId,
					userId,
					npsScore: Math.round(npsScore),
					text: text?.trim() || null,
				},
			});
			return reply.code(201).send({ feedback });
		}
	);

	// ── GET /api/v1/feedback — list feedback (owner/admin only) ──────────────
	fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
		'/api/v1/feedback',
		{ preHandler: requireRole(['owner', 'admin']) },
		async (request) => {
			const tenantId = request.user!.tenantId;
			const limit = Math.min(parseInt(String(request.query.limit ?? 50), 10) || 50, 200);
			const offset = parseInt(String(request.query.offset ?? 0), 10) || 0;
			const [items, total] = await prisma.$transaction([
				prisma.feedback.findMany({
					where: { tenantId },
					orderBy: { createdAt: 'desc' },
					take: limit,
					skip: offset,
				}),
				prisma.feedback.count({ where: { tenantId } }),
			]);
			return { items, total, limit, offset };
		}
	);

	// ── GET /api/v1/feedback/summary ─────────────────────────────────────────
	fastify.get(
		'/api/v1/feedback/summary',
		{ preHandler: requireRole(['owner', 'admin']) },
		async (request: FastifyRequest) => {
			const tenantId = request.user!.tenantId;
			const rows = await prisma.feedback.findMany({
				where: { tenantId },
				select: { npsScore: true },
			});
			const scores = rows.map((r) => r.npsScore);
			const total = scores.length;
			if (total === 0) return { total: 0, average: null, promoters: 0, passives: 0, detractors: 0, nps: null };
			const promoters = scores.filter((s) => s >= 9).length;
			const passives = scores.filter((s) => s >= 7 && s < 9).length;
			const detractors = scores.filter((s) => s < 7).length;
			const average = scores.reduce((a, b) => a + b, 0) / total;
			const nps = Math.round(((promoters - detractors) / total) * 100);
			return { total, average: Math.round(average * 10) / 10, promoters, passives, detractors, nps };
		}
	);
}
