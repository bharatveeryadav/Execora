import { FastifyInstance, FastifyRequest } from 'fastify';
import { ledgerService } from '@execora/modules';
import { broadcaster } from '../../ws/broadcaster';

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
	const n = parseInt(String(raw ?? defaultVal), 10);
	return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function ledgerRoutes(fastify: FastifyInstance) {
	fastify.post(
		'/api/v1/ledger/payment',
		{
			schema: {
				body: {
					type: 'object',
					required: ['customerId', 'amount', 'paymentMode'],
					properties: {
						customerId: { type: 'string', minLength: 1 },
						amount: { type: 'number', exclusiveMinimum: 0 },
						paymentMode: { type: 'string', enum: ['cash', 'upi', 'card', 'other'] },
						notes: { type: 'string', maxLength: 500 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: {
					customerId: string;
					amount: number;
					paymentMode: 'cash' | 'upi' | 'card' | 'other';
					notes?: string;
				};
			}>
		) => {
			const entry = await ledgerService.recordPayment(
				request.body.customerId,
				request.body.amount,
				request.body.paymentMode,
				request.body.notes
			);
			const tid = (request as any).user?.tenantId;
			if (tid)
				broadcaster.send(tid, 'payment:recorded', {
					customerId: request.body.customerId,
					amount: request.body.amount,
				});
			return { entry };
		}
	);

	fastify.post(
		'/api/v1/ledger/credit',
		{
			schema: {
				body: {
					type: 'object',
					required: ['customerId', 'amount', 'description'],
					properties: {
						customerId: { type: 'string', minLength: 1 },
						amount: { type: 'number', exclusiveMinimum: 0 },
						description: { type: 'string', minLength: 1, maxLength: 500 },
					},
					additionalProperties: false,
				},
			},
		},
		async (
			request: FastifyRequest<{
				Body: { customerId: string; amount: number; description: string };
			}>
		) => {
			const entry = await ledgerService.addCredit(
				request.body.customerId,
				request.body.amount,
				request.body.description
			);
			const tid = (request as any).user?.tenantId;
			if (tid)
				broadcaster.send(tid, 'payment:recorded', {
					customerId: request.body.customerId,
					amount: request.body.amount,
				});
			return { entry };
		}
	);

	fastify.get(
		'/api/v1/ledger/:customerId',
		async (
			request: FastifyRequest<{
				Params: { customerId: string };
				Querystring: { limit?: string };
			}>
		) => {
			const entries = await ledgerService.getCustomerLedger(
				request.params.customerId,
				parseLimit(request.query.limit, 50)
			);
			return { entries };
		}
	);
}
