/**
 * Push notification routes — device token registration.
 *
 * POST   /api/v1/push/register    — register device for push notifications
 * DELETE /api/v1/push/unregister  — unregister (remove) a device token
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/core';

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

	// ── DELETE /api/v1/push/unregister ─────────────────────────────────────────
	fastify.delete(
		'/api/v1/push/unregister',
		{
			schema: {
				body: {
					type: 'object',
					required: ['token'],
					properties: {
						token: { type: 'string', minLength: 1, maxLength: 500 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{ Body: { token: string } }>,
			reply
		) => {
			const tenantId = request.user!.tenantId;
			const userId = request.user!.userId;
			await prisma.pushDevice.deleteMany({
				where: { tenantId, userId, token: request.body.token },
			});
			return reply.code(204).send();
		}
	);
}
