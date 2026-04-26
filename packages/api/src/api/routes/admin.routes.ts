import { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '@execora/core';
import { getRuntimeConfig, setRuntimeConfig } from '@execora/core';
import { reminderQueue, whatsappQueue, mediaQueue, checkRedisHealth } from '@execora/core';
import { logger } from '@execora/core';
import { adminAuthPreHandler } from '../middleware/admin-auth';
import { hashPassword } from '@execora/core';
import { sttService, ttsService } from '@execora/modules';

/**
 * Admin REST API — all data and config endpoints for the admin frontend.
 *
 * Authentication: every route requires the x-admin-key header.
 * Set ADMIN_API_KEY env var; generate with: openssl rand -hex 32
 *
 * Sections:
 *  Dashboard   GET /admin/dashboard
 *  Customers   GET /admin/customers            GET /admin/customers/:id
 *  Invoices    GET /admin/invoices             GET /admin/invoices/:id
 *  Products    GET /admin/products             GET /admin/products/low-stock
 *  Payments    GET /admin/payments             GET /admin/payments/summary
 *  Reminders   GET /admin/reminders
 *  Sessions    GET /admin/sessions
 *  Msg Logs    GET /admin/message-logs
 *  Queues      GET /admin/queue-stats
 *  Config      GET /admin/config               PUT /admin/config
 *              POST /admin/config/reset
 *  Health      GET /admin/health/system        GET /admin/health/providers
 *  Tenants     GET /admin/tenants              POST /admin/tenants
 *              GET /admin/tenants/:id          PUT  /admin/tenants/:id
 *              PUT /admin/tenants/:id/features
 *  Users       GET /admin/users               PUT /admin/users/:id/password
 */
export async function adminRoutes(fastify: FastifyInstance) {
  // Apply auth preHandler to every route registered in this plugin
  fastify.addHook('preHandler', adminAuthPreHandler);

  // ── Dashboard ────────────────────────────────────────────────────────────
  fastify.get('/admin/dashboard', async (_request, reply) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      customerCount,
      pendingBalance,
      invoiceCounts,
      todayPayments,
      reminderCounts,
      [reminderQ, whatsappQ],
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.aggregate({ _sum: { balance: true }, where: { balance: { gt: 0 } } }),
      prisma.invoice.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.payment.aggregate({
        where:  { createdAt: { gte: today } },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.reminder.groupBy({ by: ['status'], _count: { id: true } }),
      Promise.all([
        reminderQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
        whatsappQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      ]),
    ]);

    return reply.send({
      customers: {
        total:               customerCount,
        totalPendingBalance: pendingBalance._sum.balance ?? 0,
      },
      invoices: {
        byStatus: Object.fromEntries(invoiceCounts.map((r) => [r.status, r._count.id])),
      },
      payments: {
        todayCount:   todayPayments._count.id,
        todayRevenue: todayPayments._sum.amount ?? 0,
      },
      reminders: {
        byStatus: Object.fromEntries(reminderCounts.map((r) => [r.status, r._count.id])),
      },
      queues: { reminders: reminderQ, whatsapp: whatsappQ },
      timestamp: new Date().toISOString(),
    });
  });

  // ── Customers ────────────────────────────────────────────────────────────
  fastify.get('/admin/customers', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; q?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const q     = request.query.q?.trim();

    const where: Prisma.CustomerWhereInput = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, phone: true, balance: true,
          totalPurchases: true, totalPayments: true, createdAt: true,
          _count: { select: { invoices: true, reminders: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return reply.send({
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.get('/admin/customers/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const { id } = request.params;

    const [customer, recentInvoices, paymentStats, pendingReminders] = await Promise.all([
      prisma.customer.findUnique({
        where:   { id },
        include: { preferences: true },
      }),
      prisma.invoice.findMany({
        where:   { customerId: id },
        orderBy: { createdAt: 'desc' },
        take:    10,
        select:  { id: true, invoiceNo: true, total: true, status: true, createdAt: true },
      }),
      prisma.payment.aggregate({
        where:  { customerId: id },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.reminder.findMany({
        where:   { customerId: id, status: 'pending' },
        orderBy: { scheduledTime: 'asc' },
        take:    5,
        select:  { id: true, scheduledTime: true, reminderType: true, status: true },
      }),
    ]);

    if (!customer) return reply.code(404).send({ error: 'Customer not found' });

    return reply.send({
      customer,
      recentInvoices,
      payments:        { total: paymentStats._sum.amount ?? 0, count: paymentStats._count.id },
      pendingReminders,
    });
  });

  // ── Invoices ─────────────────────────────────────────────────────────────
  fastify.get('/admin/invoices', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; customerId?: string; from?: string; to?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { status, customerId, from, to } = request.query;

    const where: Prisma.InvoiceWhereInput = {};
    if (status)     where.status     = status as Prisma.InvoiceWhereInput['status'];
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to) }),
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count:   { select: { items: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return reply.send({
      data: invoices,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.get('/admin/invoices/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const invoice = await prisma.invoice.findUnique({
      where:   { id: request.params.id },
      include: {
        customer: true,
        items:    { include: { product: { select: { id: true, name: true, unit: true } } } },
        payments: { select: { id: true, amount: true, method: true, receivedAt: true } },
      },
    });
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });
    return reply.send({ invoice });
  });

  // ── Products ─────────────────────────────────────────────────────────────
  fastify.get('/admin/products', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; q?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',   10));
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? '100', 10)));
    const skip  = (page - 1) * limit;
    const q     = request.query.q?.trim();

    const where: Prisma.ProductWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      prisma.product.count({ where }),
    ]);

    return reply.send({
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.get('/admin/products/low-stock', async (request: FastifyRequest<{
    Querystring: { threshold?: string };
  }>, reply) => {
    const threshold = Math.max(0, parseInt(request.query.threshold ?? '5', 10));
    const products  = await prisma.product.findMany({
      where:   { stock: { lte: threshold } },
      orderBy: { stock: 'asc' },
    });
    return reply.send({ data: products, threshold });
  });

  // ── Payments ─────────────────────────────────────────────────────────────
  fastify.get('/admin/payments', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; customerId?: string; from?: string; to?: string; method?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { customerId, from, to, method } = request.query;

    const where: Prisma.PaymentWhereInput = {};
    if (customerId) where.customerId = customerId;
    if (method)     where.method     = method as Prisma.PaymentWhereInput['method'];
    if (from || to) {
      where.receivedAt = {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to) }),
      };
    }

    const [payments, total, agg] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return reply.send({
      data:    payments,
      meta:    { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: { totalAmount: agg._sum.amount ?? 0 },
    });
  });

  fastify.get('/admin/payments/summary', async (request: FastifyRequest<{
    Querystring: { from?: string; to?: string };
  }>, reply) => {
    const { from, to } = request.query;
    const where: Prisma.PaymentWhereInput = {};
    if (from || to) {
      where.receivedAt = {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to) }),
      };
    }

    const [byMethod, totals] = await Promise.all([
      prisma.payment.groupBy({
        by:    ['method'],
        where,
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    ]);

    return reply.send({
      byMethod: byMethod.map((r) => ({ method: r.method, amount: r._sum.amount ?? 0, count: r._count.id })),
      total:    { amount: totals._sum.amount ?? 0, count: totals._count.id },
    });
  });

  // ── Reminders ────────────────────────────────────────────────────────────
  fastify.get('/admin/reminders', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; customerId?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { status, customerId } = request.query;

    const where: Prisma.ReminderWhereInput = {};
    if (status)     where.status     = status as Prisma.ReminderWhereInput['status'];
    if (customerId) where.customerId = customerId;

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledTime: 'asc' },
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.reminder.count({ where }),
    ]);

    return reply.send({
      data: reminders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── Conversation sessions ─────────────────────────────────────────────────
  fastify.get('/admin/sessions', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>, reply) => {
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));

    const sessions = await prisma.conversationSession.findMany({
      orderBy: { createdAt: 'desc' },
      take:    limit,
      include: {
        customer: { select: { id: true, name: true } },
        _count:   { select: { turns: true } },
      },
    });

    return reply.send({ data: sessions });
  });

  // ── Message logs ─────────────────────────────────────────────────────────
  fastify.get('/admin/message-logs', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; channel?: string; status?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { channel, status } = request.query;

    const where: Prisma.MessageLogWhereInput = {};
    if (channel) where.channel = channel as Prisma.MessageLogWhereInput['channel'];
    if (status)  where.status  = status  as Prisma.MessageLogWhereInput['status'];

    const [logs, total] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, channel: true, recipient: true, status: true,
          providerMessageId: true, errorMessage: true, createdAt: true,
          reminderId: true,
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.messageLog.count({ where }),
    ]);

    return reply.send({
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── Queue stats ──────────────────────────────────────────────────────────
  fastify.get('/admin/queue-stats', async (_request, reply) => {
    const [reminderCounts, whatsappCounts, mediaCounts] = await Promise.all([
      reminderQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused'),
      whatsappQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused'),
      mediaQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused'),
    ]);

    return reply.send({
      reminders: reminderCounts,
      whatsapp:  whatsappCounts,
      media:     mediaCounts,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Health ───────────────────────────────────────────────────────────────
  fastify.get('/admin/health/system', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    try { await prisma.$queryRaw`SELECT 1`; checks.database = 'ok'; }
    catch { checks.database = 'error'; }

    checks.redis = (await checkRedisHealth()) ? 'ok' : 'error';

    const [rc, wc] = await Promise.all([
      reminderQueue.getJobCounts('active').catch(() => ({ active: -1 })),
      whatsappQueue.getJobCounts('active').catch(() => ({ active: -1 })),
    ]);

    const allOk = Object.values(checks).every((v) => v === 'ok');
    return reply.code(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      workers: {
        reminders: { active: rc.active ?? 0 },
        whatsapp:  { active: wc.active ?? 0 },
      },
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/admin/health/providers', async (_request, reply) => {
    
    

    return reply.send({
      stt: { provider: sttService.getProvider(), available: sttService.isAvailable() },
      tts: { provider: ttsService.getProvider(), available: ttsService.isAvailable() },
      timestamp: new Date().toISOString(),
    });
  });

  // ── Runtime config ───────────────────────────────────────────────────────
  fastify.get('/admin/config', async (_request, reply) => {
    return reply.send(getRuntimeConfig());
  });

  fastify.put('/admin/config', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Request body must be a JSON object' });
    }
    try {
      await setRuntimeConfig(body as Record<string, unknown>);
      logger.info({ ip: request.ip, keys: Object.keys(body) }, 'Admin updated runtime config');
      return reply.send({ success: true, config: getRuntimeConfig() });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to update runtime config');
      return reply.code(503).send({ error: error.message });
    }
  });

  fastify.post('/admin/config/reset', async (request, reply) => {
    try {
      await setRuntimeConfig({});
      logger.info({ ip: request.ip }, 'Admin reset runtime config to defaults');
      return reply.send({ success: true, config: getRuntimeConfig() });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to reset runtime config');
      return reply.code(503).send({ error: error.message });
    }
  });

  // ── Tenants (platform-level) ──────────────────────────────────────────────
  fastify.get('/admin/tenants', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; q?: string; plan?: string; status?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { q, plan, status } = request.query;

    const where: Prisma.TenantWhereInput = {};
    if (plan)   where.plan   = plan   as Prisma.TenantWhereInput['plan'];
    if (status) where.status = status as Prisma.TenantWhereInput['status'];
    if (q) {
      where.OR = [
        { name:      { contains: q, mode: 'insensitive' } },
        { subdomain: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, subdomain: true, businessType: true,
          plan: true, status: true, currency: true, timezone: true,
          trialEndsAt: true, subscriptionEndsAt: true,
          legalName: true, gstin: true, gstRegistered: true,
          createdAt: true,
          _count: { select: { users: true, customers: true, invoices: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return reply.send({
      data: tenants,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post('/admin/tenants', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'ownerEmail', 'ownerName', 'ownerPassword'],
        properties: {
          name:            { type: 'string', minLength: 1 },
          subdomain:       { type: 'string' },
          businessType:    { type: 'string' },
          plan:            { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          currency:        { type: 'string' },
          timezone:        { type: 'string' },
          language:        { type: 'string' },
          ownerEmail:      { type: 'string', format: 'email' },
          ownerName:       { type: 'string', minLength: 1 },
          ownerPassword:   { type: 'string', minLength: 8 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      name: string; subdomain?: string; businessType?: string; plan?: string;
      currency?: string; timezone?: string; language?: string;
      ownerEmail: string; ownerName: string; ownerPassword: string;
    };
  }>, reply) => {
    const {
      name, subdomain, businessType, plan, currency, timezone, language,
      ownerEmail, ownerName, ownerPassword,
    } = request.body;

    if (subdomain) {
      const existing = await prisma.tenant.findUnique({ where: { subdomain } });
      if (existing) return reply.code(409).send({ error: 'Subdomain already taken' });
    }

    const passwordHash = await hashPassword(ownerPassword);

    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain:    subdomain ?? null,
        businessType: (businessType ?? 'retail') as Prisma.TenantCreateInput['businessType'],
        plan:         (plan ?? 'free') as Prisma.TenantCreateInput['plan'],
        currency:     currency  ?? 'INR',
        timezone:     timezone  ?? 'Asia/Kolkata',
        language:     language  ?? 'hi',
        users: {
          create: {
            email:        ownerEmail,
            name:         ownerName,
            passwordHash,
            role:         'owner',
            permissions:  [],
            isActive:     true,
          },
        },
      },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    logger.info({ tenantId: tenant.id, plan: tenant.plan, ownerEmail, ip: request.ip }, 'Tenant created by platform admin');
    return reply.code(201).send({ tenant });
  });

  fastify.get('/admin/tenants/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where:   { id: request.params.id },
      include: {
        _count: {
          select: {
            users: true, customers: true, invoices: true,
            payments: true, reminders: true,
          },
        },
        users: {
          select: {
            id: true, email: true, name: true, role: true,
            isActive: true, lastLogin: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });
    return reply.send({ tenant });
  });

  fastify.put('/admin/tenants/:id/owner-credentials', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { email: string; name: string; newPassword?: string };
  }>, reply) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: request.params.id } });
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });

    const owner = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'owner' } });
    if (!owner) return reply.code(404).send({ error: 'No owner user found for tenant' });

    const existingUser = await prisma.user.findFirst({
      where: {
        email: request.body.email,
        NOT: { id: owner.id },
      },
      select: { id: true },
    });
    if (existingUser) return reply.code(409).send({ error: 'Email already in use by another user' });

    const data: Prisma.UserUpdateInput = {
      email: request.body.email,
      name: request.body.name,
    };
    if (request.body.newPassword) {
      data.passwordHash = await hashPassword(request.body.newPassword);
    }

    const updatedOwner = await prisma.user.update({
      where: { id: owner.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });

    await prisma.session.deleteMany({ where: { userId: owner.id } });

    logger.info(
      {
        tenantId: tenant.id,
        targetUserId: owner.id,
        targetEmail: updatedOwner.email,
        passwordReset: Boolean(request.body.newPassword),
        ip: request.ip,
      },
      'Tenant owner credentials updated by platform admin',
    );

    return reply.send({ user: updatedOwner, sessionsRevoked: true });
  });

  fastify.put('/admin/tenants/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name:               { type: 'string', minLength: 1 },
          plan:               { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          status:             { type: 'string', enum: ['active', 'suspended', 'trial', 'expired'] },
          trialEndsAt:        { type: 'string', format: 'date-time' },
          subscriptionEndsAt: { type: 'string', format: 'date-time' },
          currency:           { type: 'string' },
          timezone:           { type: 'string' },
          language:           { type: 'string' },
          gstin:              { type: 'string' },
          legalName:          { type: 'string' },
          gstRegistered:      { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string; plan?: string; status?: string;
      trialEndsAt?: string; subscriptionEndsAt?: string;
      currency?: string; timezone?: string; language?: string;
      gstin?: string; legalName?: string; gstRegistered?: boolean;
    };
  }>, reply) => {
    const target = await prisma.tenant.findUnique({ where: { id: request.params.id } });
    if (!target) return reply.code(404).send({ error: 'Tenant not found' });

    const data: Prisma.TenantUpdateInput = {};
    const b = request.body;
    if (b.name               !== undefined) data.name               = b.name;
    if (b.plan               !== undefined) data.plan               = b.plan as Prisma.TenantUpdateInput['plan'];
    if (b.status             !== undefined) data.status             = b.status as Prisma.TenantUpdateInput['status'];
    if (b.currency           !== undefined) data.currency           = b.currency;
    if (b.timezone           !== undefined) data.timezone           = b.timezone;
    if (b.language           !== undefined) data.language           = b.language;
    if (b.gstin              !== undefined) data.gstin              = b.gstin;
    if (b.legalName          !== undefined) data.legalName          = b.legalName;
    if (b.gstRegistered      !== undefined) data.gstRegistered      = b.gstRegistered;
    if (b.trialEndsAt        !== undefined) data.trialEndsAt        = new Date(b.trialEndsAt);
    if (b.subscriptionEndsAt !== undefined) data.subscriptionEndsAt = new Date(b.subscriptionEndsAt);

    const updated = await prisma.tenant.update({
      where: { id: request.params.id },
      data,
      select: {
        id: true, name: true, plan: true, status: true,
        trialEndsAt: true, subscriptionEndsAt: true, updatedAt: true,
      },
    });

    logger.info({ tenantId: request.params.id, changes: Object.keys(data), ip: request.ip }, 'Tenant updated by platform admin');
    return reply.send({ tenant: updated });
  });

  fastify.put('/admin/tenants/:id/features', {
    schema: {
      body: {
        type: 'object',
        description: 'Feature flag overrides — merges with existing. Set a key to false to disable.',
        additionalProperties: { type: 'boolean' },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: Record<string, boolean>;
  }>, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: request.params.id },
      select: { id: true, features: true },
    });
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });

    const current  = (tenant.features as Record<string, boolean>) ?? {};
    const merged   = { ...current, ...request.body };

    await prisma.tenant.update({
      where: { id: request.params.id },
      data:  { features: merged },
    });

    logger.info(
      { tenantId: request.params.id, overrides: request.body, ip: request.ip },
      'Tenant features updated by platform admin',
    );
    return reply.send({ features: merged });
  });

  // ── Tenant Quota ───────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/tenants/:id/quota',
    async (request, reply) => {
      const quota = await prisma.tenantQuota.findUnique({ where: { tenantId: request.params.id } });
      if (!quota) return reply.send({ quota: null });
      return reply.send({ quota });
    },
  );

  fastify.put<{
    Params: { id: string };
    Body: Partial<{ maxUsers: number; maxInvoices: number; maxStorage: number; maxCustomers: number; maxProducts: number; notes: string }>;
  }>(
    '/admin/tenants/:id/quota',
    async (request, reply) => {
      const data = request.body;
      const quota = await prisma.tenantQuota.upsert({
        where: { tenantId: request.params.id },
        update: data,
        create: { tenantId: request.params.id, ...data },
      });
      return reply.send({ quota });
    },
  );

  // ── Platform Email (SAComms) ───────────────────────────────────────────
  fastify.post<{
    Body: { subject: string; body: string; sentTo: string[] };
  }>('/admin/communications/email', {
    schema: {
      body: {
        type: 'object',
        required: ['subject', 'body', 'sentTo'],
        properties: {
          subject: { type: 'string', minLength: 3 },
          body:    { type: 'string', minLength: 3 },
          sentTo:  { type: 'array', items: { type: 'string', format: 'email' }, minItems: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { subject, body, sentTo } = request.body;
    const email = await prisma.platformEmail.create({
      data: {
        subject,
        body,
        sentTo,
        sentBy: 'superadmin',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'platform_email',
        entityType: 'platform_email',
        entityId: email.id,
        meta: { subject, sentTo },
      },
    });

    return reply.send({ email });
  });

  fastify.get('/admin/communications/email', async (_request, reply) => {
    const emails = await prisma.platformEmail.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return reply.send({ data: emails });
  });

  // ── Impersonate Tenant ─────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/admin/tenants/:id/impersonate',
    async (request, reply) => {
      const tenant = await prisma.tenant.findUnique({ where: { id: request.params.id } });
      if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });

      const owner = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'owner' } });
      if (!owner) return reply.code(404).send({ error: 'No owner user for tenant' });

      const now = Math.floor(Date.now() / 1000);
      const exp = now + 15 * 60;
      const payload = {
        userId: owner.id,
        tenantId: tenant.id,
        role: owner.role,
        permissions: owner.permissions,
        impersonated_by: 'superadmin',
        iat: now,
        exp,
        type: 'access',
      };
      const { jwtEncode } = require('@execora/core/auth');
      const token = jwtEncode(payload);

      await prisma.activityLog.create({
        data: {
          tenantId: tenant.id,
          userId: null,
          action: 'impersonate',
          entityType: 'tenant',
          entityId: tenant.id,
          meta: { by: 'superadmin', ip: request.ip },
        },
      });

      return reply.send({ token, expiresIn: 15 * 60 });
    },
  );

  // ── Cross-tenant users (platform-level) ──────────────────────────────────
  fastify.get('/admin/users', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; q?: string; tenantId?: string; role?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { q, tenantId, role } = request.query;

    const where: Prisma.UserWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (role)     where.role     = role as Prisma.UserWhereInput['role'];
    if (q) {
      where.OR = [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, lastLogin: true, createdAt: true,
          tenant: { select: { id: true, name: true, plan: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.put('/admin/users/:id/password', {
    schema: {
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: { newPassword: { type: 'string', minLength: 8 } },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { newPassword: string };
  }>, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const newHash = await hashPassword(request.body.newPassword);
    await prisma.user.update({
      where: { id: request.params.id },
      data:  { passwordHash: newHash },
    });
    // Invalidate all existing sessions for this user
    await prisma.session.deleteMany({ where: { userId: request.params.id } });

    logger.info({ targetUserId: request.params.id, targetEmail: user.email, tenantId: user.tenantId, ip: request.ip }, 'User password reset by platform admin');
    return reply.send({ success: true });
  });

  // ── Activate / Deactivate user (cross-tenant) ─────────────────────────────
  fastify.put<{ Params: { id: string }; Body: { isActive: boolean } }>(
    '/admin/users/:id/status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['isActive'],
          properties: { isActive: { type: 'boolean' } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({ where: { id: request.params.id } });
      if (!user) return reply.code(404).send({ error: 'User not found' });
      if (user.role === 'owner' && !request.body.isActive) {
        return reply.code(403).send({ error: 'Cannot deactivate an owner account' });
      }

      await prisma.user.update({ where: { id: request.params.id }, data: { isActive: request.body.isActive } });
      if (!request.body.isActive) {
        await prisma.session.deleteMany({ where: { userId: request.params.id } });
      }
      logger.info({ targetUserId: request.params.id, isActive: request.body.isActive, ip: request.ip }, 'User status changed by platform admin');
      return reply.send({ success: true, isActive: request.body.isActive });
    },
  );

  // ── Sessions for a specific user (cross-tenant) ───────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/users/:id/sessions',
    async (request, reply) => {
      const sessions = await prisma.session.findMany({
        where:   { userId: request.params.id },
        orderBy: { lastActivity: 'desc' },
        select: {
          id: true, deviceInfo: true, ipAddress: true, userAgent: true,
          lastActivity: true, expiresAt: true, createdAt: true,
        },
      });
      return reply.send({ data: sessions });
    },
  );

  // ── Revoke all sessions for a user ────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    '/admin/users/:id/sessions',
    async (request, reply) => {
      const result = await prisma.session.deleteMany({ where: { userId: request.params.id } });
      logger.info({ targetUserId: request.params.id, count: result.count, ip: request.ip }, 'All user sessions revoked by platform admin');
      return reply.send({ success: true, revokedCount: result.count });
    },
  );

  // ── Delete (hard) a tenant ────────────────────────────────────────────────
  // WARNING: cascades to all users, customers, invoices, products, etc.
  fastify.delete<{ Params: { id: string }; Body: { confirm: string } }>(
    '/admin/tenants/:id',
    {
      schema: {
        body: {
          type: 'object',
          required: ['confirm'],
          properties: { confirm: { type: 'string' } },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const tenant = await prisma.tenant.findUnique({ where: { id: request.params.id } });
      if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });
      if (request.body.confirm !== tenant.name) {
        return reply.code(400).send({ error: 'Confirmation string must match the tenant name exactly' });
      }
      await prisma.tenant.delete({ where: { id: request.params.id } });
      logger.warn({ tenantId: request.params.id, tenantName: tenant.name, ip: request.ip }, 'Tenant HARD DELETED by platform admin');
      return reply.send({ success: true });
    },
  );

  // ── Analytics: 30-day revenue trend ──────────────────────────────────────
  fastify.get<{ Querystring: { days?: string } }>(
    '/admin/analytics/revenue',
    async (request, reply) => {
      const days   = Math.min(90, Math.max(7, parseInt(request.query.days ?? '30', 10)));
      const since  = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      // Aggregate payments by day
      const rows = await prisma.$queryRaw<{ day: string; amount: number; count: bigint }[]>`
        SELECT
          DATE(received_at AT TIME ZONE 'UTC') AS day,
          COALESCE(SUM(amount), 0)             AS amount,
          COUNT(*)                             AS count
        FROM payments
        WHERE received_at >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `;

      return reply.send({
        data: rows.map((r) => ({
          date:    r.day,
          amount:  Number(r.amount),
          count:   Number(r.count),
        })),
        period: days,
      });
    },
  );

  // ── Analytics: top tenants by revenue ────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/admin/analytics/top-tenants',
    async (request, reply) => {
      const limit = Math.min(20, Math.max(1, parseInt(request.query.limit ?? '10', 10)));

      const rows = await prisma.$queryRaw<{ tenant_id: string; tenant_name: string; revenue: number; invoice_count: bigint }[]>`
        SELECT
          t.id          AS tenant_id,
          t.name        AS tenant_name,
          COALESCE(SUM(p.amount), 0) AS revenue,
          COUNT(DISTINCT i.id)       AS invoice_count
        FROM tenants t
        LEFT JOIN payments p ON p.tenant_id = t.id
        LEFT JOIN invoices i ON i.tenant_id = t.id
        GROUP BY t.id, t.name
        ORDER BY revenue DESC
        LIMIT ${limit}
      `;

      return reply.send({
        data: rows.map((r) => ({
          tenantId:     r.tenant_id,
          tenantName:   r.tenant_name,
          revenue:      Number(r.revenue),
          invoiceCount: Number(r.invoice_count),
        })),
      });
    },
  );

  // ── Analytics: tenant summary stats ──────────────────────────────────────
  fastify.get('/admin/analytics/tenants', async (_request, reply) => {
    const [byPlan, byStatus, newThisMonth] = await Promise.all([
      prisma.tenant.groupBy({ by: ['plan'],   _count: { id: true } }),
      prisma.tenant.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.tenant.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    return reply.send({
      byPlan:       Object.fromEntries(byPlan.map((r) => [r.plan, r._count.id])),
      byStatus:     Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])),
      newThisMonth,
    });
  });

  // ── Cross-tenant activity log ─────────────────────────────────────────────
  fastify.get<{
    Querystring: { page?: string; limit?: string; tenantId?: string; action?: string; entityType?: string };
  }>(
    '/admin/activity',
    async (request, reply) => {
      const page   = Math.max(1, parseInt(request.query.page  ?? '1',  10));
      const limit  = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const skip   = (page - 1) * limit;
      const { tenantId, action, entityType } = request.query;

      const where: Prisma.ActivityLogWhereInput = {};
      if (tenantId)   where.tenantId   = tenantId;
      if (action)     where.action     = { contains: action, mode: 'insensitive' };
      if (entityType) where.entityType = entityType;

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take:    limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, action: true, entityType: true, entityId: true,
            details: true, ipAddress: true, createdAt: true,
            tenant: { select: { id: true, name: true } },
            user:   { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.activityLog.count({ where }),
      ]);

      return reply.send({
        data: logs,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    },
  );

  // ── Announcements ─────────────────────────────────────────────────────────
  fastify.get('/admin/announcements', async (_request, reply) => {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });
    return reply.send({ data: announcements });
  });

  fastify.post<{
    Body: { title: string; message: string; type?: string; expiresAt?: string };
  }>('/admin/announcements', async (request, reply) => {
    const { title, message, type, expiresAt } = request.body;
    if (!title || !message) {
      return reply.status(400).send({ error: 'title and message are required' });
    }
    const validTypes = ['info', 'warning', 'critical'];
    const announcementType = validTypes.includes(type ?? '') ? (type as 'info' | 'warning' | 'critical') : 'info';
    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: announcementType,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: 'superadmin',
      },
    });
    return reply.status(201).send(announcement);
  });

  fastify.delete<{ Params: { id: string } }>('/admin/announcements/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      await prisma.announcement.delete({ where: { id } });
    } catch {
      return reply.status(404).send({ error: 'Announcement not found' });
    }
    return reply.send({ ok: true });
  });

  // ── Maintenance Mode ──────────────────────────────────────────────────────
  fastify.get('/admin/maintenance', async (_request, reply) => {
    const record = await prisma.maintenanceWindow.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      return reply.send({ enabled: false, reason: null, estimatedEnd: null, enabledAt: null });
    }
    return reply.send(record);
  });

  fastify.put<{
    Body: { enabled: boolean; reason?: string; estimatedEnd?: string };
  }>('/admin/maintenance', async (request, reply) => {
    const { enabled, reason, estimatedEnd } = request.body;
    if (typeof enabled !== 'boolean') {
      return reply.status(400).send({ error: '"enabled" (boolean) is required' });
    }
    const existing = await prisma.maintenanceWindow.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const data = {
      enabled,
      reason: reason ?? null,
      estimatedEnd: estimatedEnd ? new Date(estimatedEnd) : null,
      enabledAt: enabled ? new Date() : null,
      enabledBy: enabled ? 'superadmin' : null,
    };
    const record = existing
      ? await prisma.maintenanceWindow.update({ where: { id: existing.id }, data })
      : await prisma.maintenanceWindow.create({ data });
    logger.info({ enabled, reason }, '[admin] Maintenance mode updated');
    return reply.send(record);
  });

  // ── Billing & Subscription Management ────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/admin/tenants/:id/billing', async (request, reply) => {
    const { id } = request.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, plan: true, status: true, trialEndsAt: true, subscriptionEndsAt: true },
    });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    const [events, credits] = await Promise.all([
      prisma.billingEvent.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.tenantCredit.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return reply.send({ tenant, events, credits });
  });

  fastify.post<{
    Params: { id: string };
    Body: { days: number; note?: string };
  }>('/admin/tenants/:id/billing/extend-trial', async (request, reply) => {
    const { id } = request.params;
    const { days, note } = request.body;
    if (!days || days < 1) return reply.status(400).send({ error: 'days must be >= 1' });

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    const base = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    const newTrialEnd = new Date(base.getTime() + days * 86_400_000);

    const [updated] = await Promise.all([
      prisma.tenant.update({ where: { id }, data: { trialEndsAt: newTrialEnd, status: 'trial' } }),
      prisma.billingEvent.create({
        data: {
          tenantId: id,
          type: 'trial_extended',
          note: note ?? `Trial extended by ${days} day(s)`,
          performedBy: 'superadmin',
        },
      }),
    ]);
    return reply.send(updated);
  });

  fastify.post<{
    Params: { id: string };
    Body: { plan: string; note?: string };
  }>('/admin/tenants/:id/billing/change-plan', async (request, reply) => {
    const { id } = request.params;
    const { plan, note } = request.body;
    const validPlans = ['free', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) return reply.status(400).send({ error: `plan must be one of: ${validPlans.join(', ')}` });

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    const [updated] = await Promise.all([
      prisma.tenant.update({ where: { id }, data: { plan: plan as 'free' | 'pro' | 'enterprise' } }),
      prisma.billingEvent.create({
        data: {
          tenantId: id,
          type: 'plan_change',
          fromPlan: tenant.plan,
          toPlan: plan as 'free' | 'pro' | 'enterprise',
          note: note ?? null,
          performedBy: 'superadmin',
        },
      }),
    ]);
    return reply.send(updated);
  });

  fastify.post<{
    Params: { id: string };
    Body: { amount: number; reason: string; expiresAt?: string };
  }>('/admin/tenants/:id/billing/add-credits', async (request, reply) => {
    const { id } = request.params;
    const { amount, reason, expiresAt } = request.body;
    if (!amount || amount < 1) return reply.status(400).send({ error: 'amount must be >= 1' });
    if (!reason) return reply.status(400).send({ error: 'reason is required' });

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    const [credit] = await Promise.all([
      prisma.tenantCredit.create({
        data: {
          tenantId: id,
          amount,
          reason,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          grantedBy: 'superadmin',
        },
      }),
      prisma.billingEvent.create({
        data: {
          tenantId: id,
          type: 'credits_added',
          note: `${amount} credits added — ${reason}`,
          performedBy: 'superadmin',
        },
      }),
    ]);
    return reply.status(201).send(credit);
  });

  fastify.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>('/admin/tenants/:id/billing/suspend', async (request, reply) => {
    const { id } = request.params;
    const { reason } = request.body ?? {};

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
    if (tenant.status === 'suspended') return reply.send({ message: 'Already suspended', tenant });

    const [updated] = await Promise.all([
      prisma.tenant.update({ where: { id }, data: { status: 'suspended' } }),
      prisma.billingEvent.create({
        data: {
          tenantId: id,
          type: 'suspended',
          fromStatus: tenant.status,
          toStatus: 'suspended',
          note: reason ?? null,
          performedBy: 'superadmin',
        },
      }),
    ]);
    return reply.send(updated);
  });

  fastify.post<{ Params: { id: string }; Body: { note?: string } }>(
    '/admin/tenants/:id/billing/reactivate',
    async (request, reply) => {
      const { id } = request.params;
      const { note } = request.body ?? {};

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

      const [updated] = await Promise.all([
        prisma.tenant.update({ where: { id }, data: { status: 'active' } }),
        prisma.billingEvent.create({
          data: {
            tenantId: id,
            type: 'reactivated',
            fromStatus: tenant.status,
            toStatus: 'active',
            note: note ?? null,
            performedBy: 'superadmin',
          },
        }),
      ]);
      return reply.send(updated);
    },
  );
}
