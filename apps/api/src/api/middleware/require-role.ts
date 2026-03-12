/**
 * Role-based access control preHandler factories.
 *
 * Usage:
 *   fastify.post('/users', { preHandler: requireRole(['owner']) }, handler)
 *   fastify.delete('/users/:id', { preHandler: requirePermission('users:manage') }, handler)
 *
 * requireAuth MUST run before these (attach to the same route or a parent scope).
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

/** Returns a preHandler that allows only the listed roles. */
export function requireRole(allowedRoles: Array<UserRole | string>) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }
  };
}

/** Returns a preHandler that allows users who have the given permission. */
export function requirePermission(permission: string) {
  return async function permissionGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (!user.permissions.includes(permission)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Missing permission: ${permission}`,
      });
    }
  };
}

/**
 * Convenience: either owner OR any user with the given permission.
 * Useful for "owner can always do X, others need explicit permission".
 */
export function requireOwnerOrPermission(permission: string) {
  return async function ownerOrPermGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'owner' && !user.permissions.includes(permission)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `This action requires the '${permission}' permission or owner role`,
      });
    }
  };
}
