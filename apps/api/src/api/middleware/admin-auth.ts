import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@execora/core';
import { logger } from '@execora/core';

/**
 * Admin API-key preHandler.
 *
 * All /admin/* routes must pass this. Callers set the header:
 *   x-admin-key: <ADMIN_API_KEY>
 *
 * Behaviour:
 *   - ADMIN_API_KEY not set + production  → 503 (admin locked down)
 *   - ADMIN_API_KEY not set + development → allowed (but warned once at startup)
 *   - ADMIN_API_KEY set, wrong/missing key → 401 Unauthorized
 *   - ADMIN_API_KEY set, correct key       → pass through
 */

let _warnedOnce = false;

export async function adminAuthPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const configuredKey = config.adminApiKey;

  if (!configuredKey) {
    if (config.nodeEnv === 'production') {
      reply.code(503).send({
        error: 'Admin endpoints are disabled. Set ADMIN_API_KEY to enable.',
      });
      return;
    }
    // Development: allow through but warn once
    if (!_warnedOnce) {
      logger.warn(
        'ADMIN_API_KEY is not set — admin endpoints are publicly accessible in development. ' +
        'Set ADMIN_API_KEY before deploying to production.'
      );
      _warnedOnce = true;
    }
    return;
  }

  const provided = request.headers['x-admin-key'];
  if (!provided || provided !== configuredKey) {
    logger.warn({ ip: request.ip, url: request.url }, 'Admin auth rejected — bad or missing x-admin-key');
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
