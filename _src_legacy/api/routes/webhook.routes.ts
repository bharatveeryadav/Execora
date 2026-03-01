import { FastifyInstance, FastifyRequest } from 'fastify';
import { whatsappService } from '../../integrations/whatsapp';
import { prisma } from '../../infrastructure/database';

export async function webhookRoutes(fastify: FastifyInstance) {
  // Verification handshake — Meta sends a challenge to confirm the endpoint
  fastify.get('/api/v1/webhook/whatsapp', {
    config: { rateLimit: false },
  }, async (request: FastifyRequest<{
    Querystring: { 'hub.mode': string; 'hub.challenge': string; 'hub.verify_token': string };
  }>, reply) => {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = request.query;
    if (mode === 'subscribe' && whatsappService.validateWebhookToken(token)) {
      return reply.code(200).send(challenge);
    }
    return reply.code(403).send('Forbidden');
  });

  // Incoming messages and delivery status updates
  fastify.post('/api/v1/webhook/whatsapp', {
    config: { rateLimit: false },
  }, async (request: FastifyRequest<{ Body: any }>, reply) => {
    const body = request.body as any;
    await whatsappService.processWebhookEvent(body);

    const statuses: Array<any> = body.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
    if (statuses.length > 0) {
      try {
        await prisma.$transaction(
          statuses.map((status: any) =>
            prisma.messageLog.updateMany({
              where: { providerMessageId: status.id },
              data: {
                status:      status.status as any,
                deliveredAt: status.status === 'delivered' ? new Date() : undefined,
                readAt:      status.status === 'read'      ? new Date() : undefined,
              },
            })
          )
        );
      } catch (error) {
        request.log.error({ error }, 'Webhook status update failed');
      }
    }

    return { status: 'ok' };
  });
}
