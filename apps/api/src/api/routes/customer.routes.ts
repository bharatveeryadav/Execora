import { FastifyInstance, FastifyRequest } from "fastify";
import {
  invoiceService,
  createCustomer,
  updateCustomer,
  updateCustomerBalance,
  deleteCustomer,
  upsertCustomerCommPrefs,
  getCustomerById,
  searchCustomers,
  listCustomers,
  listOverdueCustomers,
  getCustomerCommPrefs,
} from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";

export async function customerRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/customers — list / search (shared API client entry point) ───
  // Supports: ?q=<search>&limit=N  OR  ?page=N&limit=N
  fastify.get(
    "/api/v1/customers",
    async (
      request: FastifyRequest<{
        Querystring: { q?: string; page?: string; limit?: string };
      }>,
    ) => {
      const q = (request.query.q ?? "").trim();
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10) || 1);
      const limit = Math.min(
        200,
        Math.max(1, parseInt(request.query.limit ?? "20", 10) || 20),
      );
      const offset = (page - 1) * limit;

      if (q.length > 0) {
        const customers = await searchCustomers(q);
        return { customers, total: customers.length, page: 1, limit };
      }

      const customers = await listCustomers(limit + offset);
      const sliced = customers.slice(offset, offset + limit);
      return { customers: sliced, total: customers.length, page, limit };
    },
  );

  // ── GET /api/v1/customers/overdue — customers with unpaid balance > 0 ───────
  fastify.get("/api/v1/customers/overdue", async () => {
    const customers = await listOverdueCustomers();
    return { customers };
  });

  // ── GET /api/v1/customers/search ────────────────────────────────────────────
  fastify.get(
    "/api/v1/customers/search",
    async (
      request: FastifyRequest<{
        Querystring: { q?: string; limit?: string };
      }>,
    ) => {
      const q = request.query.q ?? "";
      const limit = parseInt(request.query.limit ?? "200", 10);
      const customers = q.trim()
        ? await searchCustomers(q)
        : await listCustomers(limit);
      return { customers };
    },
  );

  // ── GET /api/v1/customers/:id ───────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/customers/:id",
    async (request, reply) => {
      const customer = await getCustomerById(request.params.id);
      if (!customer)
        return reply.code(404).send({ error: "Customer not found" });
      return { customer };
    },
  );

  // ── PATCH /api/v1/customers/:id ─────────────────────────────────────────────
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      phone?: string;
      email?: string;
      nickname?: string;
      landmark?: string;
      creditLimit?: number;
      tags?: string[];
      notes?: string;
    };
  }>(
    "/api/v1/customers/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            phone: { type: "string", maxLength: 20 },
            email: { type: "string", maxLength: 255 },
            nickname: { type: "string", maxLength: 100 },
            landmark: { type: "string", maxLength: 255 },
            creditLimit: { type: "number", minimum: 0 },
            tags: { type: "array", items: { type: "string" } },
            notes: { type: "string", maxLength: 2000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const customer = await updateCustomer(request.params.id, request.body);
        const tid = request.user!.tenantId;
        broadcaster.send(tid, "customer:updated", { customerId: customer.id });
        return { customer };
      } catch (err: any) {
        if (err.code === "P2025")
          return reply.code(404).send({ error: "Customer not found" });
        throw err;
      }
    },
  );

  // ── GET /api/v1/customers/:id/invoices ──────────────────────────────────────
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/v1/customers/:id/invoices",
    async (request) => {
      const limit = Math.min(
        parseInt(request.query.limit ?? "50", 10) || 50,
        200,
      );
      const invoices = await invoiceService.getCustomerInvoices(
        request.params.id,
        limit,
      );
      return { invoices };
    },
  );

  // ── GET /api/v1/customers/:id/communication-prefs ───────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/customers/:id/communication-prefs",
    async (request) => {
      const prefs = await getCustomerCommPrefs(request.params.id);
      // Return empty object (not 404) when prefs don't exist yet — simpler for the UI
      return { prefs: prefs ?? null };
    },
  );

  // ── PUT /api/v1/customers/:id/communication-prefs ───────────────────────────
  fastify.put<{
    Params: { id: string };
    Body: {
      whatsappEnabled?: boolean;
      whatsappNumber?: string;
      emailEnabled?: boolean;
      emailAddress?: string;
      smsEnabled?: boolean;
      preferredLanguage?: string;
    };
  }>(
    "/api/v1/customers/:id/communication-prefs",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            whatsappEnabled: { type: "boolean" },
            whatsappNumber: { type: "string", maxLength: 20 },
            emailEnabled: { type: "boolean" },
            emailAddress: { type: "string", maxLength: 255 },
            smsEnabled: { type: "boolean" },
            preferredLanguage: { type: "string", maxLength: 10 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const prefs = await upsertCustomerCommPrefs(
          request.params.id,
          request.body,
        );
        return { prefs };
      } catch (err: any) {
        if (err.message === "Customer not found")
          return reply.code(404).send({ error: "Customer not found" });
        throw err;
      }
    },
  );

  // ── POST /api/v1/customers ──────────────────────────────────────────────────
  fastify.post<{
    Body: {
      name: string;
      phone?: string;
      email?: string;
      nickname?: string;
      landmark?: string;
      notes?: string;
      openingBalance?: number;
      creditLimit?: number;
      tags?: string[];
    };
  }>(
    "/api/v1/customers",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            phone: { type: "string", maxLength: 20 },
            email: { type: "string", maxLength: 255 },
            nickname: { type: "string", maxLength: 100 },
            landmark: { type: "string", maxLength: 255 },
            notes: { type: "string", maxLength: 1000 },
            openingBalance: { type: "number" },
            creditLimit: { type: "number", minimum: 0 },
            tags: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const customer = await createCustomer(request.body);
      const tid = request.user!.tenantId;
      broadcaster.send(tid, "customer:created", { customerId: customer.id });
      return reply.code(201).send({ customer });
    },
  );

  // ── GET /api/v1/customers/:id/last-order — for Repeat Last Bill ────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/customers/:id/last-order",
    async (request, reply) => {
      const invoice = await invoiceService.getLastOrder(request.params.id);
      if (!invoice)
        return reply.code(404).send({ error: "No previous order found" });
      return { invoice };
    },
  );

  // ── DELETE /api/v1/customers/:id ────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/customers/:id",
    async (request, reply) => {
      const result = await deleteCustomer(request.params.id);
      if (!result.success)
        return reply
          .code(404)
          .send({ error: "Customer not found or delete failed" });
      const tid = request.user!.tenantId;
      broadcaster.send(tid, "customer:deleted", {
        customerId: request.params.id,
      });
      return { ok: true };
    },
  );
}
