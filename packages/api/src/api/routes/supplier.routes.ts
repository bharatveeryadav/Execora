/**
 * Supplier routes — full CRUD for suppliers.
 *
 * GET    /api/v1/suppliers       — list (optional ?q= search)
 * GET    /api/v1/suppliers/:id   — get by ID
 * POST   /api/v1/suppliers       — create
 * PUT    /api/v1/suppliers/:id   — update
 * DELETE /api/v1/suppliers/:id   — delete
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
} from "@execora/modules";
import { prisma } from "@execora/core";
import { getGstinValidationError } from "@execora/shared";

function parseLimit(raw: unknown, defaultVal = 50, maxVal = 200): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function supplierRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/suppliers ─────────────────────────────────────────────────
  fastify.get(
    "/api/v1/suppliers",
    async (
      request: FastifyRequest<{
        Querystring: { q?: string; limit?: string };
      }>,
    ) => {
      const tenantId = request.user!.tenantId;
      const q = (request.query.q ?? "").trim();
      const limit = parseLimit(request.query.limit, 50);
      const suppliers = await listSuppliers(tenantId, q, limit);
      return { suppliers };
    },
  );

  // ── GET /api/v1/suppliers/:id ─────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/suppliers/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const supplier = await getSupplierById(tenantId, request.params.id);

      if (!supplier) {
        return reply.code(404).send({ error: "Supplier not found" });
      }

      return { supplier };
    },
  );

  // ── POST /api/v1/suppliers ────────────────────────────────────────────────
  fastify.post(
    "/api/v1/suppliers",
    {
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            companyName: { type: "string", maxLength: 255 },
            phone: { type: "string", maxLength: 20 },
            email: { type: "string", maxLength: 255 },
            address: { type: "string", maxLength: 500 },
            gstin: { type: "string", maxLength: 15 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          companyName?: string;
          phone?: string;
          email?: string;
          address?: string;
          gstin?: string;
        };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const { gstin } = request.body;
      if (gstin) {
        const gstinErr = getGstinValidationError(gstin.trim());
        if (gstinErr)
          return reply
            .code(400)
            .send({ error: "INVALID_GSTIN", message: gstinErr });
      }
      const supplier = await createSupplier(tenantId, request.body);
      return reply.code(201).send({ supplier });
    },
  );

  // ── PUT /api/v1/suppliers/:id ─────────────────────────────────────────────
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: string;
      companyName?: string;
      phone?: string;
      email?: string;
      address?: string;
      gstin?: string;
      paymentTerms?: string;
    };
  }>(
    "/api/v1/suppliers/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            companyName: { type: "string", maxLength: 255 },
            phone: { type: "string", maxLength: 20 },
            email: { type: "string", maxLength: 255 },
            address: { type: "string", maxLength: 500 },
            gstin: { type: "string", maxLength: 15 },
            paymentTerms: { type: "string", maxLength: 100 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const { gstin, ...rest } = request.body;
      if (gstin) {
        const gstinErr = getGstinValidationError(gstin.trim());
        if (gstinErr)
          return reply
            .code(400)
            .send({ error: "INVALID_GSTIN", message: gstinErr });
      }
      const existing = await prisma.supplier.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.code(404).send({ error: "Supplier not found" });
      const supplier = await prisma.supplier.update({
        where: { id: request.params.id },
        data: { ...rest, ...(gstin ? { gstin: gstin.trim() } : {}) },
      });
      return { supplier };
    },
  );

  // ── DELETE /api/v1/suppliers/:id ─────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/suppliers/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const existing = await prisma.supplier.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!existing) return reply.code(404).send({ error: "Supplier not found" });
      // Guard: block delete if open purchase orders exist
      const openPOs = await prisma.purchaseOrder.count({
        where: { supplierId: request.params.id, status: { in: ["pending", "partial"] } },
      });
      if (openPOs > 0)
        return reply.code(409).send({ error: "Cannot delete supplier with open purchase orders" });
      await prisma.supplier.delete({ where: { id: request.params.id } });
      return reply.code(204).send();
    },
  );
}
