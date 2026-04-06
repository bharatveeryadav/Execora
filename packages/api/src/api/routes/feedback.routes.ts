/**
 * Feedback routes — NPS + text submission.
 *
 * POST /api/v1/feedback — submit NPS score (0-10) and optional text
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/core';

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
}
