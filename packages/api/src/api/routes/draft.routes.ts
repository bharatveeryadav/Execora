/**
 * Draft / Staging System — /api/v1/drafts
 *
 * Any form submission (purchase, product, stock-adjustment) first creates a
 * Draft record. The user can review, edit, and confirm the draft at any time.
 * Confirmation executes the real DB write and broadcasts real-time WS events.
 *
 * Draft types:
 *  • purchase_entry  → Expense (type:'purchase') + broadcaster 'purchase:created'
 *  • product         → Product create          + broadcaster 'product:created'
 *  • stock_adjustment→ Product stock increment + broadcaster 'product:updated'
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  createDraft,
  listDrafts,
  getDraft,
  updateDraft,
  confirmDraft,
  discardDraft,
} from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";

type DraftType = "purchase_entry" | "product" | "stock_adjustment";

function tenantId(req: FastifyRequest): string {
  return req.user!.tenantId;
}

// ─── route plugin ─────────────────────────────────────────────────────────────

export async function draftRoutes(fastify: FastifyInstance) {
  // ── POST /api/v1/drafts ────────────────────────────────────────────────────
  fastify.post(
    "/api/v1/drafts",
    {
      schema: {
        body: {
          type: "object",
          required: ["type", "data"],
          properties: {
            type: {
              type: "string",
              enum: ["purchase_entry", "product", "stock_adjustment"],
            },
            title: { type: "string" },
            data: { type: "object" },
            notes: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          type: DraftType;
          title?: string;
          data: Record<string, unknown>;
          notes?: string;
        };
      }>,
    ) => {
      const tid = tenantId(request);
      const draft = await createDraft(tid, request.user!.userId, request.body);
      broadcaster.send(tid, "draft:created", { draft });
      return { draft };
    },
  );

  // ── GET /api/v1/drafts ────────────────────────────────────────────────────
  fastify.get(
    "/api/v1/drafts",
    async (
      request: FastifyRequest<{
        Querystring: { type?: string; status?: string; limit?: string };
      }>,
    ) => {
      const tid = tenantId(request);
      const limit = Math.min(
        parseInt(request.query.limit ?? "100", 10) || 100,
        200,
      );
      return listDrafts(tid, {
        type: request.query.type,
        status: request.query.status,
        limit,
      });
    },
  );

  // ── GET /api/v1/drafts/:id ────────────────────────────────────────────────
  fastify.get(
    "/api/v1/drafts/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const tid = tenantId(request);
      const draft = await getDraft(tid, request.params.id);
      if (!draft) return reply.code(404).send({ error: "Draft not found" });
      return { draft };
    },
  );

  // ── PUT /api/v1/drafts/:id ────────────────────────────────────────────────
  fastify.put(
    "/api/v1/drafts/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            data: { type: "object" },
            title: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          data?: Record<string, unknown>;
          title?: string;
          notes?: string;
        };
      }>,
      reply,
    ) => {
      const tid = tenantId(request);
      try {
        const draft = await updateDraft(tid, request.params.id, request.body);
        broadcaster.send(tid, "draft:updated", { draft });
        return { draft };
      } catch (err: any) {
        const is404 = /not found/i.test(err.message);
        return reply.code(is404 ? 404 : 409).send({ error: err.message });
      }
    },
  );

  // ── POST /api/v1/drafts/:id/confirm ──────────────────────────────────────
  fastify.post(
    "/api/v1/drafts/:id/confirm",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const tid = tenantId(request);
      try {
        const { draft, result } = await confirmDraft(tid, request.params.id);
        // broadcast the per-type entity event
        const r = result as Record<string, unknown>;
        if (draft.type === "purchase_entry")
          broadcaster.send(tid, "purchase:created", r);
        else if (draft.type === "product")
          broadcaster.send(tid, "product:created", r);
        else if (draft.type === "stock_adjustment")
          broadcaster.send(tid, "product:updated", r);
        broadcaster.send(tid, "draft:confirmed", {
          draftId: draft.id,
          type: draft.type,
          title: draft.title,
        });
        return { draft, result };
      } catch (err: any) {
        fastify.log.error(
          { draftId: request.params.id, err },
          "Draft confirm failed",
        );
        const is404 = /not found/i.test(err.message);
        const code = is404 ? 404 : /already/i.test(err.message) ? 409 : 422;
        return reply
          .code(code)
          .send({ error: err.message ?? "Confirm failed" });
      }
    },
  );

  // ── DELETE /api/v1/drafts/:id ─────────────────────────────────────────────
  fastify.delete(
    "/api/v1/drafts/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const tid = tenantId(request);
      try {
        const draft = await discardDraft(tid, request.params.id);
        broadcaster.send(tid, "draft:discarded", { draftId: draft.id });
        return { ok: true };
      } catch (err: any) {
        return reply.code(404).send({ error: err.message });
      }
    },
  );
}
