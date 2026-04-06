/**
 * Tenant feature-flag preHandler factory.
 *
 * Reads the Tenant.features JSON from the DB (cached per-request via Prisma)
 * and rejects requests for disabled features.
 *
 * Usage:
 *   fastify.get('/gst/report', { preHandler: [requireAuth, requireFeature('gst_enabled')] }, handler)
 *
 * The features JSON on the Tenant model is the authoritative source. Platform admin
 * can override any tenant's features via PUT /admin/tenants/:id/features.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@execora/core';
import { logger } from '@execora/core';

export function requireFeature(featureKey: string) {
  return async function featureGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    try {
      const tenant = await prisma.tenant.findUnique({
        where:  { id: user.tenantId },
        select: { features: true, plan: true },
      });

      if (!tenant) {
        reply.code(403).send({ error: 'Tenant not found' });
        return;
      }

      const features = (tenant.features as Record<string, boolean>) ?? {};
      if (!features[featureKey]) {
        logger.warn(
          { tenantId: user.tenantId, feature: featureKey, plan: tenant.plan },
          'Feature not enabled for tenant'
        );
        reply.code(403).send({
          error:   'Feature not available',
          message: `The '${featureKey}' feature is not enabled on your plan (${tenant.plan}).`,
        });
        return; // prevent handler from executing after the 403 response
      }
    } catch (err: any) {
      logger.error({ err, featureKey }, 'Feature check failed');
      reply.code(500).send({ error: 'Internal error during feature check' });
    }
  };
}
