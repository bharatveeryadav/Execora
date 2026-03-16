/**
 * Push notification routes — device token registration (Sprint 15).
 *
 * POST /api/v1/push/register — register device for push notifications
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';

export async function pushRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/v1/push/register',
		{
			schema: {
				body: {
					type: 'object',
					required: ['token'],
					properties: {
						token: { type: 'string', minLength: 1, maxLength: 500 },
						platform: { type: 'string', enum: ['ios', 'android'] },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { token: string; platform?: 'ios' | 'android' };
			}>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const userId = request.user!.userId;
			const { token, platform } = request.body;

			await prisma.pushDevice.upsert({
				where: {
					tenantId_userId_token: { tenantId, userId, token },
				},
				create: {
					tenantId,
					userId,
					token,
					platform: platform ?? null,
				},
				update: {
					platform: platform ?? undefined,
					updatedAt: new Date(),
				},
			});

			return reply.code(200).send({ ok: true });
		}
	);
}
