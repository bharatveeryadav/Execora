import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { customerService } from '../business/customer.service';
import { invoiceService } from '../business/invoice.service';
import { ledgerService } from '../business/ledger.service';
import { reminderService } from '../business/reminder.service';
import { productService } from '../business/product.service';
import { voiceSessionService } from '../business/voice-session.service';
import { whatsappService } from '../services/whatsapp.service';
import { prisma } from '../lib/database';

export async function registerRoutes(fastify: FastifyInstance<any, any, any, any>) {
  // Ignore Chrome DevTools probe endpoint to avoid noisy 404 logs
  fastify.get('/.well-known/appspecific/com.chrome.devtools.json', async (request, reply) => {
    return reply.code(204).send();
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Customer routes
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

  fastify.post('/api/customers', async (request: FastifyRequest<{
    Body: { name: string; phone?: string; nickname?: string; landmark?: string };
  }>, reply) => {
    const customer = await customerService.createCustomer(request.body);
    return { customer };
  });

  // Product routes
  fastify.get('/api/products', async (request, reply) => {
    const products = await productService.getAllProducts();
    return { products };
  });

  fastify.post('/api/products', async (request: FastifyRequest<{
    Body: { name: string; price: number; stock: number; description?: string; unit?: string };
  }>, reply) => {
    const product = await productService.createProduct(request.body);
    return { product };
  });

  fastify.get('/api/products/low-stock', async (request, reply) => {
    const products = await productService.getLowStockProducts();
    return { products };
  });

  // Invoice routes
  fastify.get('/api/invoices', async (request: FastifyRequest<{
    Querystring: { limit?: number };
  }>, reply) => {
    const limit = request.query.limit || 20;
    const invoices = await invoiceService.getRecentInvoices(limit);
    return { invoices };
  });

  fastify.post('/api/invoices', async (request: FastifyRequest<{
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
    return { invoice };
  });

  fastify.post('/api/invoices/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const invoice = await invoiceService.cancelInvoice(request.params.id);
    return { invoice };
  });

  // Ledger routes
  fastify.post('/api/ledger/payment', async (request: FastifyRequest<{
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

  fastify.post('/api/ledger/credit', async (request: FastifyRequest<{
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
    Querystring: { limit?: number };
  }>, reply) => {
    const limit = request.query.limit || 50;
    const entries = await ledgerService.getCustomerLedger(request.params.customerId, limit);
    return { entries };
  });

  // Reminder routes
  fastify.get('/api/reminders', async (request: FastifyRequest<{
    Querystring: { customerId?: string };
  }>, reply) => {
    const reminders = await reminderService.getPendingReminders(request.query.customerId);
    return { reminders };
  });

  fastify.post('/api/reminders', async (request: FastifyRequest<{
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
    return { reminder };
  });

  fastify.post('/api/reminders/:id/cancel', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const reminder = await reminderService.cancelReminder(request.params.id);
    return { reminder };
  });

  // Recording routes
  fastify.get('/api/sessions', async (request: FastifyRequest<{
    Querystring: { limit?: number };
  }>, reply) => {
    const limit = request.query.limit || 20;
    const sessions = await voiceSessionService.getRecentSessions(limit);
    return { sessions };
  });

  fastify.get('/api/recordings/:id/url', async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply) => {
    const url = await voiceSessionService.getRecordingUrl(request.params.id);
    return { url };
  });

  // Summary routes
  fastify.get('/api/summary/daily', async (request, reply) => {
    const summary = await invoiceService.getDailySummary();
    return { summary };
  });

  // WhatsApp webhook routes
  fastify.get('/api/webhook/whatsapp', async (request: FastifyRequest<{
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

  fastify.post('/api/webhook/whatsapp', async (request: FastifyRequest<{
    Body: any;
  }>, reply) => {
    const body = request.body as any;
    await whatsappService.processWebhookEvent(body);

    // Update message status if applicable
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.statuses) {
        for (const status of value.statuses) {
          await prisma.whatsAppMessage.updateMany({
            where: { messageId: status.id },
            data: {
              status: status.status.toUpperCase(),
              deliveredAt: status.status === 'delivered' ? new Date() : undefined,
              readAt: status.status === 'read' ? new Date() : undefined,
            },
          });
        }
      }
    } catch (error) {
      request.log.error({ error }, 'Webhook status update failed');
    }

    return { status: 'ok' };
  });
}
