/**
 * POS (Point of Sale) session and counter management routes
 *
 * GET    /api/v1/pos/session/active    — get active counter session
 * POST   /api/v1/pos/session/open      — open a counter session
 * POST   /api/v1/pos/session/close     — close a counter session
 * GET    /api/v1/pos/sessions          — list recent sessions (?limit=)
 * GET    /api/v1/pos/cart              — list active cart drafts (?status=)
 * POST   /api/v1/pos/cart              — create a new cart draft
 * GET    /api/v1/pos/cart/:id          — get a cart draft
 * PUT    /api/v1/pos/cart/:id          — update cart draft (add/remove items)
 * POST   /api/v1/pos/cart/:id/checkout — confirm cart → invoice
 * DELETE /api/v1/pos/cart/:id          — discard a cart draft
 *
 * All routes require JWT auth (inherited from parent scope).
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "@execora/core";

export async function posRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/pos/session/active ───────────────────────────────────────
  fastify.get(
    "/api/v1/pos/session/active",
    async (
      request: FastifyRequest<{ Querystring: { counterId?: string } }>,
    ) => {
      const counterId = request.query.counterId ?? "default";
      // POS counter sessions are not yet persisted — return null until counter session table is added
      return { session: null, counterId };
    },
  );

  // ── POST /api/v1/pos/session/open ────────────────────────────────────────
  fastify.post(
    "/api/v1/pos/session/open",
    {
      schema: {
        body: {
          type: "object",
          required: ["openingCash"],
          properties: {
            counterId: { type: "string", maxLength: 100 },
            openingCash: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { counterId?: string; openingCash: number };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;
      const counterId = request.body.counterId ?? "default";
      // Stub — POS counter session persistence pending counter-session table
      const session = {
        id: `POS-${Date.now()}`,
        tenantId,
        counterId,
        openedBy: userId,
        openedAt: new Date().toISOString(),
        openingCash: request.body.openingCash,
        status: "open" as const,
      };
      return reply.code(201).send({ session });
    },
  );

  // ── POST /api/v1/pos/session/close ───────────────────────────────────────
  fastify.post(
    "/api/v1/pos/session/close",
    {
      schema: {
        body: {
          type: "object",
          required: ["sessionId", "closingCash"],
          properties: {
            sessionId: { type: "string", minLength: 1 },
            closingCash: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { sessionId: string; closingCash: number };
      }>,
    ) => {
      // Stub — POS counter session persistence pending counter-session table
      const session = {
        id: request.body.sessionId,
        closedAt: new Date().toISOString(),
        closingCash: request.body.closingCash,
        status: "closed" as const,
      };
      return { session };
    },
  );

  // ── GET /api/v1/pos/sessions ─────────────────────────────────────────────
  // List recent conversation sessions as a proxy for POS activity
  fastify.get(
    "/api/v1/pos/sessions",
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>) => {
      const tenantId = request.user!.tenantId;
      const limit = Math.min(
        parseInt(String(request.query.limit ?? 20), 10) || 20,
        100,
      );
      const sessions = await prisma.conversationSession.findMany({
        where: { tenantId },
        orderBy: { sessionStart: "desc" },
        take: limit,
        select: {
          id: true,
          userId: true,
          customerId: true,
          sessionStart: true,
          status: true,
          channel: true,
        },
      });
      return { sessions, count: sessions.length };
    },
  );

  // ── GET /api/v1/pos/cart ─────────────────────────────────────────────────
  fastify.get(
    "/api/v1/pos/cart",
    async (request: FastifyRequest<{ Querystring: { status?: string } }>) => {
      const tenantId = request.user!.tenantId;
      const status = request.query.status ?? "pending";
      const carts = await prisma.draft.findMany({
        where: { tenantId, status },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { carts };
    },
  );

  // ── POST /api/v1/pos/cart ────────────────────────────────────────────────
  fastify.post(
    "/api/v1/pos/cart",
    {
      schema: {
        body: {
          type: "object",
          required: ["type", "data"],
          properties: {
            type: { type: "string", minLength: 1 },
            data: { type: "object" },
            title: { type: "string", maxLength: 255 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { type: string; data: Record<string, unknown>; title?: string };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;
      const cart = await prisma.draft.create({
        data: {
          tenantId,
          createdBy: userId,
          type: request.body.type,
          data: request.body.data as any,
          title: request.body.title ?? null,
          status: "pending",
        },
      });
      return reply.code(201).send({ cart });
    },
  );

  // ── GET /api/v1/pos/cart/:id ─────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/pos/cart/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const cart = await prisma.draft.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!cart) return reply.code(404).send({ error: "Cart not found" });
      return { cart };
    },
  );

  // ── PUT /api/v1/pos/cart/:id ─────────────────────────────────────────────
  // Per CLAUDE.md: hoist generic to method when using typed Params + Body together
  fastify.put<{ Params: { id: string }; Body: { data?: Record<string, unknown>; title?: string } }>(
    "/api/v1/pos/cart/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            data: { type: "object" },
            title: { type: "string", maxLength: 255 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const cart = await prisma.draft.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!cart) return reply.code(404).send({ error: "Cart not found" });
      if (cart.status !== "pending")
        return reply.code(409).send({ error: "Cart is already confirmed or discarded" });
      const updated = await prisma.draft.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.data ? { data: request.body.data as any } : {}),
          ...(request.body.title !== undefined ? { title: request.body.title } : {}),
          updatedAt: new Date(),
        },
      });
      return { cart: updated };
    },
  );

  // ── POST /api/v1/pos/cart/:id/checkout ──────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/pos/cart/:id/checkout",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const cart = await prisma.draft.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!cart) return reply.code(404).send({ error: "Cart not found" });
      if (cart.status !== "pending")
        return reply.code(409).send({ error: "Cart is already confirmed or discarded" });
      const confirmed = await prisma.draft.update({
        where: { id: request.params.id },
        data: { status: "confirmed", updatedAt: new Date() },
      });
      return {
        cart: confirmed,
        message: "Cart checked out. Invoice will be created by the processing queue.",
      };
    },
  );

  // ── DELETE /api/v1/pos/cart/:id ──────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/pos/cart/:id",
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const cart = await prisma.draft.findFirst({
        where: { id: request.params.id, tenantId },
      });
      if (!cart) return reply.code(404).send({ error: "Cart not found" });
      if (cart.status === "confirmed")
        return reply.code(409).send({ error: "Cannot discard a confirmed cart" });
      await prisma.draft.update({
        where: { id: request.params.id },
        data: { status: "discarded", updatedAt: new Date() },
      });
      return reply.code(204).send();
    },
  );
}
