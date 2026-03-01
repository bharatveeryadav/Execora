/**
 * Authentication routes — public (no JWT required).
 *
 * POST /api/v1/auth/login          — email + password → access + refresh tokens
 * POST /api/v1/auth/refresh        — rotate refresh token → new token pair
 * POST /api/v1/auth/logout         — revoke refresh token
 * GET  /api/v1/auth/me             — current user profile (requires JWT)
 * PUT  /api/v1/auth/me/password    — change own password (requires JWT)
 * POST /api/v1/auth/hash           — generate a scrypt hash for a password
 *                                    (admin tool, disabled in production unless ADMIN_API_KEY matches)
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { config } from '@execora/infrastructure';
import {
  generateTokens,
  verifyPassword,
  hashPassword,
  rotateRefreshToken,
  revokeRefreshToken,
  isPasswordSet,
} from '@execora/infrastructure';
import { requireAuth } from '../middleware/require-auth';

export async function authRoutes(fastify: FastifyInstance) {
  // ── POST /api/v1/auth/login ────────────────────────────────────────────────
  fastify.post('/api/v1/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
          tenantId: { type: 'string' },           // optional — for future multi-tenant subdomain routing
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { email: string; password: string; tenantId?: string };
  }>, reply) => {
    const { email, password, tenantId } = request.body;

    // Look up user — if tenantId provided, scope the search
    const where: any = { email };
    if (tenantId) where.tenantId = tenantId;

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true, tenantId: true, email: true, name: true,
        role: true, permissions: true, passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      // Generic message — don't reveal whether email exists
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    if (!isPasswordSet(user.passwordHash)) {
      return reply.code(401).send({
        error: 'Account not activated',
        message: 'Password has not been set for this account. Contact your administrator.',
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      logger.warn({ email, ip: request.ip }, 'Failed login attempt');
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLogin: new Date(), lastIp: request.ip },
    });

    const tokens = await generateTokens(user);

    logger.info({ userId: user.id, tenantId: user.tenantId, role: user.role }, 'User logged in');

    return reply.send({
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn:    tokens.expiresIn,
      user: {
        id:          user.id,
        tenantId:    user.tenantId,
        email:       user.email,
        name:        user.name,
        role:        user.role,
        permissions: user.permissions,
      },
    });
  });

  // ── POST /api/v1/auth/refresh ──────────────────────────────────────────────
  fastify.post('/api/v1/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply) => {
    try {
      const tokens = await rotateRefreshToken(request.body.refreshToken);
      return reply.send(tokens);
    } catch (err: any) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
  });

  // ── POST /api/v1/auth/logout ───────────────────────────────────────────────
  fastify.post('/api/v1/auth/logout', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply) => {
    await revokeRefreshToken(request.body.refreshToken);
    return reply.send({ success: true });
  });

  // ── GET /api/v1/auth/me ────────────────────────────────────────────────────
  fastify.get('/api/v1/auth/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where:  { id: request.user!.userId },
      select: {
        id: true, tenantId: true, email: true, name: true, phone: true,
        role: true, permissions: true, avatarUrl: true, preferences: true,
        lastLogin: true, createdAt: true,
        tenant: { select: { id: true, name: true, plan: true, features: true, status: true } },
      },
    });

    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ user });
  });

  // ── PUT /api/v1/auth/me/password ───────────────────────────────────────────
  fastify.put('/api/v1/auth/me/password', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword:     { type: 'string', minLength: 8 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { currentPassword: string; newPassword: string };
  }>, reply) => {
    const { currentPassword, newPassword } = request.body;

    const user = await prisma.user.findUnique({
      where:  { id: request.user!.userId },
      select: { passwordHash: true },
    });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    if (!isPasswordSet(user.passwordHash)) {
      return reply.code(400).send({ error: 'Cannot verify current password — account not activated' });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: 'Current password is incorrect' });

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: request.user!.userId }, data: { passwordHash: newHash } });

    logger.info({ userId: request.user!.userId }, 'User changed their password');
    return reply.send({ success: true });
  });

  // ── POST /api/v1/auth/hash ─────────────────────────────────────────────────
  // Utility endpoint: generate a scrypt hash from a plaintext password.
  // Protected by ADMIN_API_KEY so it can't be used by the public.
  fastify.post('/api/v1/auth/hash', {
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: { password: { type: 'string', minLength: 1 } },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{ Body: { password: string } }>, reply) => {
    const key = request.headers['x-admin-key'];
    if (!config.adminApiKey || key !== config.adminApiKey) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const hash = await hashPassword(request.body.password);
    return reply.send({ hash, usage: 'Set ADMIN_PASSWORD_HASH=<hash> in .env' });
  });
}
