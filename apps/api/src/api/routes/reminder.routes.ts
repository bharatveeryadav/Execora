import { FastifyInstance, FastifyRequest } from 'fastify';
import { reminderService } from '@execora/modules';
import { broadcaster } from '../../ws/broadcaster';
import { SYSTEM_TENANT_ID } from '@execora/infrastructure';

export async function reminderRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/api/v1/reminders',
		async (
			request: FastifyRequest<{
				Querystring: { customerId?: string };
			}>
		) => {
			const reminders = await reminderService.getPendingReminders(request.query.customerId);
			return { reminders };
		}
	);

	fastify.post(
		'/api/v1/reminders',
		{
			schema: {
				body: {
					type: 'object',
					required: ['customerId', 'amount', 'datetime'],
					properties: {
						customerId: { type: 'string', minLength: 1 },
						amount: { type: 'number', exclusiveMinimum: 0 },
						datetime: { type: 'string', minLength: 1 },
						message: { type: 'string', maxLength: 1000 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { customerId: string; amount: number; datetime: string; message?: string };
			}>,
			reply
		) => {
			const reminder = await reminderService.scheduleReminder(
				request.body.customerId,
				request.body.amount,
				request.body.datetime,
				request.body.message
			);
			const tid = (request as any).user?.tenantId ?? SYSTEM_TENANT_ID;
			broadcaster.send(tid, 'reminder:created', { reminderId: reminder.id, customerId: reminder.customerId });
			return reply.code(201).send({ reminder });
		}
	);

	fastify.post(
		'/api/v1/reminders/:id/cancel',
		async (
			request: FastifyRequest<{
				Params: { id: string };
			}>,
			reply
		) => {
			const reminder = await reminderService.cancelReminder(request.params.id);
			const tid = (request as any).user?.tenantId ?? SYSTEM_TENANT_ID;
			broadcaster.send(tid, 'reminder:cancelled', { reminderId: request.params.id });
			return reply.send({ reminder });
		}
	);

	// ── POST /api/v1/reminders/bulk — schedule reminders for overdue customers ──
	fastify.post(
		'/api/v1/reminders/bulk',
		{
			schema: {
				body: {
					type: 'object',
					required: ['customerIds'],
					properties: {
						customerIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
						message: { type: 'string', maxLength: 1000 },
						daysOffset: { type: 'integer', minimum: 0, maximum: 30 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { customerIds: string[]; message?: string; daysOffset?: number };
			}>,
			reply
		) => {
			const reminders = await reminderService.bulkScheduleReminders(request.body);
			const tid = (request as any).user?.tenantId ?? SYSTEM_TENANT_ID;
			broadcaster.send(tid, 'reminder:created', { count: reminders.length });
			return reply.code(201).send({ reminders });
		}
	);
}
