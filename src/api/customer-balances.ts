import { FastifyInstance } from 'fastify';
import { customerService } from '../modules/customer/customer.service';

export default async function customerBalancesApi(fastify: FastifyInstance) {
    fastify.get('/customer-balances', async (request, reply) => {
        const customers = await customerService.getAllCustomersWithPendingBalance();
        const total = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
        reply.send({
            customers,
            totalPending: total,
        });
    });
}
