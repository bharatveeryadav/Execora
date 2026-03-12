import { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { whatsappService } from '@execora/infrastructure';
import { prisma } from '@execora/infrastructure';

/** Minimal shape of a Meta WhatsApp status update object */
interface WhatsAppStatusEntry {
  id: string;
  status: string;
}

/** Minimal shape of the Meta WhatsApp webhook payload */
interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: WhatsAppStatusEntry[];
      };
    }>;
  }>;
}

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
  fastify.post<{ Body: WhatsAppWebhookBody }>('/api/v1/webhook/whatsapp', {
    config: { rateLimit: false },
  }, async (request, _reply) => {
    const body = request.body;
    await whatsappService.processWebhookEvent(body as Record<string, unknown>);

    const statuses: WhatsAppStatusEntry[] = body.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
    if (statuses.length > 0) {
      try {
        await prisma.$transaction(
          statuses.map((status) =>
            prisma.messageLog.updateMany({
              where: { providerMessageId: status.id },
              data: {
                status:      status.status as Prisma.MessageLogUpdateManyMutationInput['status'],
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
