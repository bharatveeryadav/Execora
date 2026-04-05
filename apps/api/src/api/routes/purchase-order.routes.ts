/**
 * Purchase Order routes — create, list, receive, cancel.
 *
 * POST   /api/v1/purchase-orders             — create
 * GET    /api/v1/purchase-orders             — list (filter: status, supplierId)
 * GET    /api/v1/purchase-orders/:id         — single PO
 * PATCH  /api/v1/purchase-orders/:id         — update draft
 * POST   /api/v1/purchase-orders/:id/receive — mark goods received (updates stock)
 * POST   /api/v1/purchase-orders/:id/cancel  — cancel
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "@execora/modules";

function parseLimit(raw: unknown, defaultVal = 50, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function purchaseOrderRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/purchase-orders ────────────────────────────────────────────
  fastify.get(
    "/api/v1/purchase-orders",
    async (
      request: FastifyRequest<{
        Querystring: { status?: string; supplierId?: string; limit?: string };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      const limit = parseLimit(request.query.limit, 50);
      const orders = await listPurchaseOrders(tenantId, {
        status: request.query.status,
        supplierId: request.query.supplierId,
        limit,
      });
      return { purchaseOrders: orders };
    },
  );

  // ── GET /api/v1/purchase-orders/:id ─────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/purchase-orders/:id",
    async (request, reply) => {
      const po = await getPurchaseOrderById(
        request.user!.tenantId,
        request.params.id,
      );
      if (!po)
        return reply.code(404).send({ error: "Purchase order not found" });
      return { purchaseOrder: po };
    },
  );

  // ── POST /api/v1/purchase-orders ──────────────────────────────────────────
  fastify.post(
    "/api/v1/purchase-orders",
    {
      schema: {
        body: {
          type: "object",
          required: ["items"],
          properties: {
            supplierId: { type: "string" },
            expectedDate: { type: "string" },
            notes: { type: "string", maxLength: 1000 },
            status: { type: "string", enum: ["draft", "pending"] },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productId", "quantity", "unitPrice"],
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0 },
                  batchNo: { type: "string", maxLength: 50 },
                  expiryDate: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          supplierId?: string;
          expectedDate?: string;
          notes?: string;
          status?: "draft" | "pending";
          items: Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
            batchNo?: string;
            expiryDate?: string;
          }>;
        };
      }>,
      reply,
    ) => {
      const po = await createPurchaseOrder(
        request.user!.tenantId,
        request.user!.userId,
        request.body,
      );
      return reply.code(201).send({ purchaseOrder: po });
    },
  );

  // ── PATCH /api/v1/purchase-orders/:id ──────────────────────────────────────
  fastify.patch(
    "/api/v1/purchase-orders/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            supplierId: { type: "string" },
            expectedDate: { type: "string" },
            notes: { type: "string", maxLength: 1000 },
            status: { type: "string", enum: ["draft", "pending"] },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productId", "quantity", "unitPrice"],
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0 },
                  batchNo: { type: "string" },
                  expiryDate: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          supplierId?: string;
          expectedDate?: string;
          notes?: string;
          status?: "draft" | "pending";
          items?: Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
            batchNo?: string;
            expiryDate?: string;
          }>;
        };
      }>,
      reply,
    ) => {
      try {
        const po = await updatePurchaseOrder(
          request.user!.tenantId,
          request.params.id,
          request.body,
        );
        if (!po)
          return reply.code(404).send({ error: "Purchase order not found" });
        return { purchaseOrder: po };
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    },
  );

  // ── POST /api/v1/purchase-orders/:id/receive ────────────────────────────────
  fastify.post(
    "/api/v1/purchase-orders/:id/receive",
    {
      schema: {
        body: {
          type: "object",
          required: ["receipts"],
          properties: {
            receipts: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["itemId", "receivedQty"],
                properties: {
                  itemId: { type: "string" },
                  receivedQty: { type: "integer", minimum: 0 },
                  batchNo: { type: "string" },
                  expiryDate: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          receipts: Array<{
            itemId: string;
            receivedQty: number;
            batchNo?: string;
            expiryDate?: string;
          }>;
        };
      }>,
      reply,
    ) => {
      try {
        const po = await receivePurchaseOrder(
          request.user!.tenantId,
          request.params.id,
          request.body.receipts,
        );
        if (!po)
          return reply.code(404).send({ error: "Purchase order not found" });
        return { purchaseOrder: po };
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    },
  );

  // ── POST /api/v1/purchase-orders/:id/cancel ─────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/purchase-orders/:id/cancel",
    async (request, reply) => {
      try {
        const po = await cancelPurchaseOrder(
          request.user!.tenantId,
          request.params.id,
        );
        if (!po)
          return reply.code(404).send({ error: "Purchase order not found" });
        return { purchaseOrder: po };
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    },
  );
}
