import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../infrastructure/database';
import { getRuntimeConfig, setRuntimeConfig } from '../../infrastructure/runtime-config';
import { reminderQueue, whatsappQueue, mediaQueue, checkRedisHealth } from '../../infrastructure/queue';
import { logger } from '../../infrastructure/logger';
import { adminAuthPreHandler } from '../middleware/admin-auth';
import { hashPassword } from '../../infrastructure/auth';

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

    const where: any = q
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

    const where: any = {};
    if (status)     where.status     = status;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
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

    const where: any = q ? { name: { contains: q, mode: 'insensitive' } } : {};

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

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (method)     where.method     = method;
    if (from || to) {
      where.receivedAt = {};
      if (from) where.receivedAt.gte = new Date(from);
      if (to)   where.receivedAt.lte = new Date(to);
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
    const where: any = {};
    if (from || to) {
      where.receivedAt = {};
      if (from) where.receivedAt.gte = new Date(from);
      if (to)   where.receivedAt.lte = new Date(to);
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

    const where: any = {};
    if (status)     where.status     = status;
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

    const where: any = {};
    if (channel) where.channel = channel;
    if (status)  where.status  = status;

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
    const { sttService } = await import('../../providers/stt');
    const { ttsService } = await import('../../providers/tts');

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
      await setRuntimeConfig(body as any);
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

    const where: any = {};
    if (plan)   where.plan   = plan;
    if (status) where.status = status;
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
        businessType: (businessType ?? 'retail') as any,
        plan:         (plan ?? 'free') as any,
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

    logger.info({ tenantId: tenant.id, plan: tenant.plan }, 'Tenant created by platform admin');
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

    const data: any = {};
    const b = request.body;
    if (b.name               !== undefined) data.name               = b.name;
    if (b.plan               !== undefined) data.plan               = b.plan;
    if (b.status             !== undefined) data.status             = b.status;
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

    logger.info({ tenantId: request.params.id, changes: Object.keys(data) }, 'Tenant updated by platform admin');
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
      { tenantId: request.params.id, overrides: request.body },
      'Tenant features updated by platform admin',
    );
    return reply.send({ features: merged });
  });

  // ── Cross-tenant users (platform-level) ──────────────────────────────────
  fastify.get('/admin/users', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; q?: string; tenantId?: string; role?: string };
  }>, reply) => {
    const page  = Math.max(1, parseInt(request.query.page  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
    const skip  = (page - 1) * limit;
    const { q, tenantId, role } = request.query;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (role)     where.role     = role;
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

    logger.info({ targetUserId: request.params.id, tenantId: user.tenantId }, 'User password reset by platform admin');
    return reply.send({ success: true });
  });
}
