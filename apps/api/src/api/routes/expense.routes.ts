/**
 * Expense & Purchase Routes — /api/v1/expenses and /api/v1/purchases
 *
 * Both expenses (operating costs) and purchases (stock buys) are stored
 * in the unified `expenses` table with a `type` discriminator.
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  listExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
  listPurchases,
  createPurchase,
  deletePurchase,
  getCashbook,
} from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";

export async function expenseRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/expenses ──────────────────────────────────────────────────
  fastify.get(
    "/api/v1/expenses",
    async (
      request: FastifyRequest<{
        Querystring: {
          from?: string;
          to?: string;
          category?: string;
          type?: string;
          supplier?: string;
          limit?: string;
        };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      const { from, to, category, supplier, type: typeFilter } = request.query;
      const limit = Math.min(
        parseInt(request.query.limit ?? "200", 10) || 200,
        500,
      );
      return listExpenses(tenantId, {
        from,
        to,
        category,
        type: typeFilter,
        supplier,
        limit,
      });
    },
  );

  // ── POST /api/v1/expenses ─────────────────────────────────────────────────
  fastify.post(
    "/api/v1/expenses",
    {
      schema: {
        body: {
          type: "object",
          required: ["category", "amount"],
          properties: {
            category: { type: "string", minLength: 1 },
            amount: { type: "number", minimum: 0.01 },
            note: { type: "string" },
            supplier: { type: "string" },
            date: { type: "string" },
            type: { type: "string", enum: ["expense", "income"] },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          category: string;
          amount: number;
          note?: string;
          supplier?: string;
          date?: string;
          type?: "expense" | "income";
        };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const expense = await createExpense(tenantId, request.body);
      broadcaster.send(tenantId, "expense:created", { expenseId: expense.id });
      return reply.code(201).send({ expense });
    },
  );

  // ── DELETE /api/v1/expenses/:id ───────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/expenses/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const deletedId = await deleteExpense(tenantId, request.params.id);
      if (!deletedId) return reply.code(404).send({ error: "Not found" });
      broadcaster.send(tenantId, "expense:deleted", { expenseId: deletedId });
      return { ok: true };
    },
  );

  // ── GET /api/v1/expenses/summary ──────────────────────────────────────────
  fastify.get(
    "/api/v1/expenses/summary",
    async (
      request: FastifyRequest<{
        Querystring: { from?: string; to?: string };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      return getExpenseSummary(tenantId, request.query.from, request.query.to);
    },
  );

  // ── GET /api/v1/purchases ─────────────────────────────────────────────────
  fastify.get(
    "/api/v1/purchases",
    async (
      request: FastifyRequest<{
        Querystring: {
          from?: string;
          to?: string;
          supplier?: string;
          limit?: string;
        };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      const limit = Math.min(
        parseInt(request.query.limit ?? "200", 10) || 200,
        500,
      );
      return listPurchases(tenantId, {
        from: request.query.from,
        to: request.query.to,
        supplier: request.query.supplier,
        limit,
      });
    },
  );

  // ── POST /api/v1/purchases ────────────────────────────────────────────────
  fastify.post(
    "/api/v1/purchases",
    {
      schema: {
        body: {
          type: "object",
          required: ["category", "amount", "itemName"],
          properties: {
            category: { type: "string", minLength: 1 },
            amount: { type: "number", minimum: 0.01 },
            itemName: { type: "string", minLength: 1 },
            supplier: { type: "string" },
            quantity: { type: "number", minimum: 0 },
            unit: { type: "string" },
            ratePerUnit: { type: "number", minimum: 0 },
            note: { type: "string" },
            batchNo: { type: "string" },
            expiryDate: { type: "string" },
            date: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          category: string;
          amount: number;
          itemName: string;
          supplier?: string;
          quantity?: number;
          unit?: string;
          ratePerUnit?: number;
          note?: string;
          batchNo?: string;
          expiryDate?: string;
          date?: string;
        };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const purchase = await createPurchase(tenantId, request.body);
      broadcaster.send(tenantId, "purchase:created", {
        purchaseId: purchase.id,
      });
      return reply.code(201).send({ purchase });
    },
  );

  // ── DELETE /api/v1/purchases/:id ──────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/purchases/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const deletedId = await deletePurchase(tenantId, request.params.id);
      if (!deletedId) return reply.code(404).send({ error: "Not found" });
      broadcaster.send(tenantId, "purchase:deleted", { purchaseId: deletedId });
      return { ok: true };
    },
  );

  // ── GET /api/v1/cashbook ─────────────────────────────────────────────────
  // Derives a running cash ledger from: payments (cash IN) + expenses (cash OUT)
  fastify.get(
    "/api/v1/cashbook",
    async (
      request: FastifyRequest<{
        Querystring: { from?: string; to?: string };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      return getCashbook(tenantId, request.query.from, request.query.to);
    },
  );
}
