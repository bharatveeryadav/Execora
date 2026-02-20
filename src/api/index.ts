import { FastifyInstance, FastifyRequest } from 'fastify';
import { customerService } from '../modules/customer/customer.service';
import { invoiceService } from '../modules/invoice/invoice.service';
import { ledgerService } from '../modules/ledger/ledger.service';
import { reminderService } from '../modules/reminder/reminder.service';
import { productService } from '../modules/product/product.service';
import { voiceSessionService } from '../modules/voice/session.service';
import { whatsappService } from '../integrations/whatsapp';
import { prisma } from '../infrastructure/database';
import { checkRedisHealth } from '../infrastructure/queue';

/** Safely parse a query limit: string|number → integer, capped at maxVal */
function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function registerRoutes(fastify: FastifyInstance<any, any, any, any>) {
  // Ignore Chrome DevTools probe endpoint to avoid noisy 404 logs
  fastify.get('/.well-known/appspecific/com.chrome.devtools.json', async (request, reply) => {
    return reply.code(204).send();
  });

  // ── Health check ────────────────────────────────────────────────────────────
  // Returns 503 if any dependency is down so orchestrators can act accordingly
  fastify.get('/health', async (request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    checks.redis = (await checkRedisHealth()) ? 'ok' : 'error';

    const allOk = Object.values(checks).every((s) => s === 'ok');
    return reply.code(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    });
  });

  // ── Customer routes ─────────────────────────────────────────────────────────
  fastify.get('/api/customers/search', async (request: FastifyRequest<{
    Querystring: { q: string };
  }>, reply) => {
    const { q } = request.query;
    const customers = await customerService.searchCustomer(q);
    return { customers };
  });

  fastify.get('/api/customers/:id', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const customer = await customerService.getCustomerById(request.params.id);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }
    return { customer };
  });

  fastify.post('/api/customers', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name:     { type: 'string', minLength: 1, maxLength: 255 },
          phone:    { type: 'string', maxLength: 20 },
          nickname: { type: 'string', maxLength: 100 },
          landmark: { type: 'string', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { name: string; phone?: string; nickname?: string; landmark?: string };
  }>, reply) => {
    const customer = await customerService.createCustomer(request.body);
    return reply.code(201).send({ customer });
  });

  // ── Product routes ──────────────────────────────────────────────────────────
  fastify.get('/api/products', async (request, reply) => {
    const products = await productService.getAllProducts();
    return { products };
  });

  fastify.post('/api/products', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price', 'stock'],
        properties: {
          name:        { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          price:       { type: 'number', minimum: 0 },
          stock:       { type: 'integer', minimum: 0 },
          unit:        { type: 'string', maxLength: 50 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { name: string; price: number; stock: number; description?: string; unit?: string };
  }>, reply) => {
    const product = await productService.createProduct(request.body);
    return reply.code(201).send({ product });
  });

  fastify.get('/api/products/low-stock', async (request, reply) => {
    const products = await productService.getLowStockProducts();
    return { products };
  });

  // ── Invoice routes ──────────────────────────────────────────────────────────
  fastify.get('/api/invoices', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>, reply) => {
    const invoices = await invoiceService.getRecentInvoices(parseLimit(request.query.limit, 20));
    return { invoices };
  });

  fastify.post('/api/invoices', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId: { type: 'string', minLength: 1 },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productName', 'quantity'],
              properties: {
                productName: { type: 'string', minLength: 1, maxLength: 255 },
                quantity:    { type: 'integer', minimum: 1 },
              },
              additionalProperties: false,
            },
          },
          notes: { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      items: Array<{ productName: string; quantity: number }>;
      notes?: string;
    };
  }>, reply) => {
    const invoice = await invoiceService.createInvoice(
      request.body.customerId,
      request.body.items,
      request.body.notes
    );
    return reply.code(201).send({ invoice });
  });

  fastify.post('/api/invoices/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const invoice = await invoiceService.cancelInvoice(request.params.id);
    return { invoice };
  });

  // ── Ledger routes ───────────────────────────────────────────────────────────
  fastify.post('/api/ledger/payment', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'amount', 'paymentMode'],
        properties: {
          customerId:  { type: 'string', minLength: 1 },
          amount:      { type: 'number', exclusiveMinimum: 0 },
          paymentMode: { type: 'string', enum: ['cash', 'upi', 'card', 'other'] },
          notes:       { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      amount: number;
      paymentMode: 'cash' | 'upi' | 'card' | 'other';
      notes?: string;
    };
  }>, reply) => {
    const entry = await ledgerService.recordPayment(
      request.body.customerId,
      request.body.amount,
      request.body.paymentMode,
      request.body.notes
    );
    return { entry };
  });

  fastify.post('/api/ledger/credit', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'amount', 'description'],
        properties: {
          customerId:  { type: 'string', minLength: 1 },
          amount:      { type: 'number', exclusiveMinimum: 0 },
          description: { type: 'string', minLength: 1, maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      amount: number;
      description: string;
    };
  }>, reply) => {
    const entry = await ledgerService.addCredit(
      request.body.customerId,
      request.body.amount,
      request.body.description
    );
    return { entry };
  });

  fastify.get('/api/ledger/:customerId', async (request: FastifyRequest<{
    Params: { customerId: string };
    Querystring: { limit?: string };
  }>, reply) => {
    const entries = await ledgerService.getCustomerLedger(
      request.params.customerId,
      parseLimit(request.query.limit, 50)
    );
    return { entries };
  });

  // ── Reminder routes ─────────────────────────────────────────────────────────
  fastify.get('/api/reminders', async (request: FastifyRequest<{
    Querystring: { customerId?: string };
  }>, reply) => {
    const reminders = await reminderService.getPendingReminders(request.query.customerId);
    return { reminders };
  });

  fastify.post('/api/reminders', {
    schema: {
      body: {
        type: 'object',
        required: ['customerId', 'amount', 'datetime'],
        properties: {
          customerId: { type: 'string', minLength: 1 },
          amount:     { type: 'number', exclusiveMinimum: 0 },
          datetime:   { type: 'string', minLength: 1 },
          message:    { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      customerId: string;
      amount: number;
      datetime: string;
      message?: string;
    };
  }>, reply) => {
    const reminder = await reminderService.scheduleReminder(
      request.body.customerId,
      request.body.amount,
      request.body.datetime,
      request.body.message
    );
    return reply.code(201).send({ reminder });
  });

  fastify.post('/api/reminders/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const reminder = await reminderService.cancelReminder(request.params.id);
    return { reminder };
  });

  // ── Session / recording routes ──────────────────────────────────────────────
  fastify.get('/api/sessions', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>, reply) => {
    const sessions = await voiceSessionService.getRecentSessions(
      parseLimit(request.query.limit, 20)
    );
    return { sessions };
  });

  fastify.get('/api/recordings/:id/url', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const url = await voiceSessionService.getRecordingUrl(request.params.id);
    return { url };
  });

  // ── Summary routes ──────────────────────────────────────────────────────────
  fastify.get('/api/summary/daily', async (request, reply) => {
    const summary = await invoiceService.getDailySummary();
    return { summary };
  });

  // ── WhatsApp webhook routes ─────────────────────────────────────────────────
  // Rate limiting excluded — Meta sends status bursts that can exceed normal limits
  fastify.get('/api/webhook/whatsapp', {
    config: { rateLimit: false },
  }, async (request: FastifyRequest<{
    Querystring: {
      'hub.mode': string;
      'hub.challenge': string;
      'hub.verify_token': string;
    };
  }>, reply) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && whatsappService.validateWebhookToken(token)) {
      return reply.code(200).send(challenge);
    } else {
      return reply.code(403).send('Forbidden');
    }
  });

  fastify.post('/api/webhook/whatsapp', {
    config: { rateLimit: false },
  }, async (request: FastifyRequest<{
    Body: any;
  }>, reply) => {
    const body = request.body as any;
    await whatsappService.processWebhookEvent(body);

    // Update message statuses atomically in a single transaction
    try {
      const statuses: Array<any> = body.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];

      if (statuses.length > 0) {
        await prisma.$transaction(
          statuses.map((status: any) =>
            prisma.whatsAppMessage.updateMany({
              where: { messageId: status.id },
              data: {
                status: status.status.toUpperCase(),
                deliveredAt: status.status === 'delivered' ? new Date() : undefined,
                readAt: status.status === 'read' ? new Date() : undefined,
              },
            })
          )
        );
      }
    } catch (error) {
      request.log.error({ error }, 'Webhook status update failed');
    }

    return { status: 'ok' };
  });
}
