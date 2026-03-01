/**
 * JWT authentication preHandler.
 *
 * Validates the `Authorization: Bearer <token>` header on every protected route.
 * On success, updates the tenantContext so the real userId/tenantId flows through
 * all services and the DB audit log for this request.
 *
 * Attach to a scoped Fastify instance (see api/index.ts) or to individual routes.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../../infrastructure/auth';
import { tenantContext } from '../../infrastructure/tenant-context';
import { logger } from '../../infrastructure/logger';
import { UserJwtPayload } from '../../types';

// Extend FastifyRequest so route handlers can access the decoded payload.
declare module 'fastify' {
  interface FastifyRequest {
    user?: UserJwtPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Attach to request for downstream route handlers
    request.user = payload;

    // Override the default system context with the authenticated user's identity.
    // tenantContext.update() uses AsyncLocalStorage.enterWith() so all async code
    // (route handlers → services → Prisma middleware) sees the real values.
    tenantContext.update({ tenantId: payload.tenantId, userId: payload.userId });

  } catch (err: any) {
    logger.warn({ ip: request.ip, url: request.url, error: err.message }, 'JWT auth rejected');
    reply.code(401).send({ error: 'Unauthorized', message: err.message });
  }
}
