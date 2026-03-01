import { FastifyInstance } from 'fastify';
import { customerService } from '../modules/customer/customer.service';

export default async function customerTotalPendingApi(fastify: FastifyInstance) {
    fastify.get('/customer-total-pending', async (request, reply) => {
        const totalPending = await customerService.getTotalPendingAmount();
        reply.send({ totalPending });
    });
}
