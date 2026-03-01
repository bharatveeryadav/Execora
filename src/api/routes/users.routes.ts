/**
 * User management routes — all require JWT auth.
 * All operations are scoped to the caller's tenantId (multi-tenant safe).
 *
 * Roles:
 *   GET  /api/v1/users          — users:read  (any authenticated user)
 *   POST /api/v1/users          — users:manage (owner only by default)
 *   GET  /api/v1/users/:id      — users:read
 *   PUT  /api/v1/users/:id      — users:manage
 *   DELETE /api/v1/users/:id    — owner only
 *   POST /api/v1/users/:id/reset-password — owner only
 *
 * Small shop (single user): only the owner exists and manages themselves via /auth/me.
 * SME/corporate: owner creates staff accounts with specific permissions.
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { hashPassword } from '../../infrastructure/auth';
import { requirePermission, requireRole } from '../middleware/require-role';
import { ROLE_DEFAULT_PERMISSIONS } from '../../types';

export async function usersRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/users ─────────────────────────────────────────────────────
  fastify.get('/api/v1/users', {
    preHandler: [requirePermission('users:read')],
  }, async (request, reply) => {
    const { tenantId } = request.user!;
    const users = await prisma.user.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, permissions: true, isActive: true,
        lastLogin: true, createdAt: true,
      },
    });
    return reply.send({ users });
  });

  // ── POST /api/v1/users ────────────────────────────────────────────────────
  fastify.post('/api/v1/users', {
    preHandler: [requireRole(['owner', 'admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'name', 'role', 'password'],
        properties: {
          email:       { type: 'string', format: 'email' },
          name:        { type: 'string', minLength: 1, maxLength: 100 },
          phone:       { type: 'string', maxLength: 20 },
          role:        { type: 'string', enum: ['admin', 'manager', 'staff', 'viewer'] },
          password:    { type: 'string', minLength: 8 },
          permissions: {
            type:  'array',
            items: { type: 'string' },
            description: 'Override default role permissions. Leave empty to use role defaults.',
          },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      email: string; name: string; phone?: string;
      role: string; password: string; permissions?: string[];
    };
  }>, reply) => {
    const { tenantId } = request.user!;
    const { email, name, phone, role, password, permissions } = request.body;

    // Only owner can create admin-level users
    if (role === 'admin' && request.user!.role !== 'owner') {
      return reply.code(403).send({ error: 'Only owner can create admin-level users' });
    }

    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) return reply.code(409).send({ error: 'A user with this email already exists' });

    const passwordHash = await hashPassword(password);
    const effectivePerms: string[] = permissions?.length
      ? permissions
      : (ROLE_DEFAULT_PERMISSIONS[role] ?? []) as string[];

    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        phone,
        role:         role as any,
        permissions:  effectivePerms,
        passwordHash,
        isActive:     true,
      },
      select: {
        id: true, email: true, name: true, role: true,
        permissions: true, createdAt: true,
      },
    });

    logger.info({ createdBy: request.user!.userId, newUserId: user.id, role }, 'User created');
    return reply.code(201).send({ user });
  });

  // ── GET /api/v1/users/:id ─────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/v1/users/:id', {
    preHandler: [requirePermission('users:read')],
  }, async (request, reply) => {
    const { tenantId } = request.user!;
    const user = await prisma.user.findFirst({
      where:  { id: request.params.id, tenantId },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, permissions: true, isActive: true,
        lastLogin: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ user });
  });

  // ── PUT /api/v1/users/:id ─────────────────────────────────────────────────
  fastify.put<{
    Params: { id: string };
    Body: { name?: string; phone?: string; role?: string; permissions?: string[]; isActive?: boolean };
  }>('/api/v1/users/:id', {
    preHandler: [requirePermission('users:manage')],
    schema: {
      body: {
        type: 'object',
        properties: {
          name:        { type: 'string', minLength: 1, maxLength: 100 },
          phone:       { type: 'string', maxLength: 20 },
          role:        { type: 'string', enum: ['admin', 'manager', 'staff', 'viewer'] },
          permissions: { type: 'array', items: { type: 'string' } },
          isActive:    { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { tenantId, userId: callerId, role: callerRole } = request.user!;
    const targetId = request.params.id;

    // Can't modify owner account unless you are the owner
    const target = await prisma.user.findFirst({ where: { id: targetId, tenantId } });
    if (!target) return reply.code(404).send({ error: 'User not found' });
    if (target.role === 'owner' && callerRole !== 'owner') {
      return reply.code(403).send({ error: "Cannot modify owner account" });
    }

    const data: any = {};
    if (request.body.name        !== undefined) data.name        = request.body.name;
    if (request.body.phone       !== undefined) data.phone       = request.body.phone;
    if (request.body.isActive    !== undefined) data.isActive    = request.body.isActive;
    if (request.body.role        !== undefined) {
      if (request.body.role === 'owner') {
        return reply.code(403).send({ error: "Cannot assign owner role via API" });
      }
      data.role = request.body.role;
    }
    if (request.body.permissions !== undefined) data.permissions = request.body.permissions;

    const updated = await prisma.user.update({
      where:  { id: targetId },
      data,
      select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true },
    });

    logger.info({ updatedBy: callerId, targetId, changes: Object.keys(data) }, 'User updated');
    return reply.send({ user: updated });
  });

  // ── DELETE /api/v1/users/:id (deactivate, not hard-delete) ───────────────
  fastify.delete<{ Params: { id: string } }>('/api/v1/users/:id', {
    preHandler: [requireRole(['owner'])],
  }, async (request, reply) => {
    const { tenantId, userId: callerId } = request.user!;
    const targetId = request.params.id;

    if (targetId === callerId) {
      return reply.code(400).send({ error: 'Cannot deactivate your own account' });
    }

    const target = await prisma.user.findFirst({ where: { id: targetId, tenantId } });
    if (!target) return reply.code(404).send({ error: 'User not found' });
    if (target.role === 'owner') {
      return reply.code(403).send({ error: 'Cannot deactivate owner account' });
    }

    // Deactivate + invalidate all sessions
    await prisma.user.update({ where: { id: targetId }, data: { isActive: false } });
    await prisma.session.deleteMany({ where: { userId: targetId } });

    logger.info({ deactivatedBy: callerId, targetId }, 'User deactivated');
    return reply.send({ success: true });
  });

  // ── POST /api/v1/users/:id/reset-password ─────────────────────────────────
  fastify.post<{
    Params: { id: string };
    Body: { newPassword: string };
  }>('/api/v1/users/:id/reset-password', {
    preHandler: [requireRole(['owner'])],
    schema: {
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: { newPassword: { type: 'string', minLength: 8 } },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { tenantId, userId: callerId } = request.user!;
    const target = await prisma.user.findFirst({ where: { id: request.params.id, tenantId } });
    if (!target) return reply.code(404).send({ error: 'User not found' });

    const newHash = await hashPassword(request.body.newPassword);
    await prisma.user.update({ where: { id: request.params.id }, data: { passwordHash: newHash } });
    // Invalidate all existing sessions for this user
    await prisma.session.deleteMany({ where: { userId: request.params.id } });

    logger.info({ resetBy: callerId, targetId: request.params.id }, 'User password reset by owner');
    return reply.send({ success: true });
  });
}
