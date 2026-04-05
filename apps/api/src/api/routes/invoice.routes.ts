import { FastifyInstance, FastifyRequest } from "fastify";
import {
  createInvoiceCommand,
  invoiceService,
  ledgerService,
} from "@execora/modules";
import { getGstinValidationError } from "@execora/shared";
import { broadcaster } from "../../ws/broadcaster";
import { makePortalToken } from "@execora/infrastructure";

function parseLimit(raw: unknown, defaultVal: number, maxVal = 100): number {
  const n = parseInt(String(raw ?? defaultVal), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maxVal) : defaultVal;
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/invoices ──────────────────────────────────────────────────
  fastify.get(
    "/api/v1/invoices",
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string };
      }>,
    ) => {
      const invoices = await invoiceService.getRecentInvoices(
        parseLimit(request.query.limit, 20),
      );
      return { invoices };
    },
  );

  // ── GET /api/v1/invoices/:id ──────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/invoices/:id",
    async (request, reply) => {
      const invoice = await invoiceService.getInvoiceById(request.params.id);
      if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
      return { invoice };
    },
  );

  // ── POST /api/v1/invoices — create regular invoice ────────────────────────
  fastify.post(
    "/api/v1/invoices",
    {
      schema: {
        body: {
          type: "object",
          required: ["customerId", "items"],
          properties: {
            customerId: { type: "string", minLength: 1 },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productName", "quantity"],
                properties: {
                  productName: { type: "string", minLength: 1, maxLength: 255 },
                  quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0 },
                  lineDiscountPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                  hsnCode: { type: "string", maxLength: 8 },
                },
                additionalProperties: false,
              },
            },
            notes: { type: "string", maxLength: 1000 },
            // Discount
            discountPercent: { type: "number", minimum: 0, maximum: 100 },
            discountAmount: { type: "number", minimum: 0 },
            // GST
            withGst: { type: "boolean" },
            supplyType: { type: "string", enum: ["INTRASTATE", "INTERSTATE"] },
            // B2B
            buyerGstin: { type: "string", maxLength: 15 },
            placeOfSupply: { type: "string", maxLength: 2 },
            recipientAddress: { type: "string", maxLength: 500 },
            reverseCharge: { type: "boolean" },
            overrideCreditLimit: { type: "boolean" },
            tags: {
              type: "array",
              items: { type: "string", maxLength: 50 },
              maxItems: 10,
            },
            // Partial payment at billing
            initialPayment: {
              type: "object",
              required: ["amount", "method"],
              properties: {
                amount: { type: "number", minimum: 0.01 },
                method: {
                  type: "string",
                  enum: ["cash", "upi", "card", "other"],
                },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          customerId: string;
          items: Array<{
            productName: string;
            quantity: number;
            unitPrice?: number;
            lineDiscountPercent?: number;
            hsnCode?: string;
          }>;
          notes?: string;
          discountPercent?: number;
          discountAmount?: number;
          withGst?: boolean;
          supplyType?: "INTRASTATE" | "INTERSTATE";
          buyerGstin?: string;
          placeOfSupply?: string;
          recipientAddress?: string;
          reverseCharge?: boolean;
          overrideCreditLimit?: boolean;
          tags?: string[];
          initialPayment?: {
            amount: number;
            method: "cash" | "upi" | "card" | "other";
          };
        };
      }>,
      reply,
    ) => {
      const { customerId, items, notes, ...opts } = request.body;
      // S11-08: Reject B2B invoices with malformed GSTIN at API
      if (opts.withGst && opts.buyerGstin?.trim()) {
        const err = getGstinValidationError(opts.buyerGstin.trim());
        if (err) {
          return reply.code(400).send({
            error: "INVALID_GSTIN",
            message: err,
          });
        }
      }
      try {
        const result = await createInvoiceCommand.execute({
          customerId,
          items,
          notes,
          options: opts,
        });
        const tid = request.user!.tenantId;
        if (tid)
          broadcaster.send(tid, "invoice:created", {
            invoiceId: result.invoice.id,
            invoiceNo: result.invoice.invoiceNo,
          });
        // Fire-and-forget: generate PDF (with UPI QR) + send email to customer
        invoiceService
          .dispatchInvoicePdfEmail(result.invoice.id)
          .catch((err) =>
            fastify.log.error(
              { err, invoiceId: result.invoice.id },
              "invoice pdf/email dispatch failed",
            ),
          );
        return reply
          .code(201)
          .send({
            invoice: result.invoice,
            autoCreatedProducts: result.autoCreatedProducts,
          });
      } catch (err: any) {
        if (err?.message?.startsWith("CREDIT_LIMIT_EXCEEDED:")) {
          const [, rest] = err.message.split(":");
          const parts: Record<string, string> = {};
          const [name, ...kvs] = rest.split("|");
          for (const kv of kvs) {
            const [k, v] = kv.split("=");
            parts[k] = v;
          }
          return reply.code(422).send({
            error: "CREDIT_LIMIT_EXCEEDED",
            message: `Credit limit exceeded for ${name}`,
            customerName: name,
            limit: parseFloat(parts.limit ?? "0"),
            currentBalance: parseFloat(parts.balance ?? "0"),
            invoiceAmount: parseFloat(parts.invoice ?? "0"),
          });
        }
        throw err;
      }
    },
  );

  // ── POST /api/v1/invoices/proforma — create proforma / quotation ──────────
  fastify.post(
    "/api/v1/invoices/proforma",
    {
      schema: {
        body: {
          type: "object",
          required: ["customerId", "items"],
          properties: {
            customerId: { type: "string", minLength: 1 },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productName", "quantity"],
                properties: {
                  productName: { type: "string", minLength: 1, maxLength: 255 },
                  quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0 },
                  lineDiscountPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                  hsnCode: { type: "string", maxLength: 8 },
                },
                additionalProperties: false,
              },
            },
            notes: { type: "string", maxLength: 1000 },
            discountPercent: { type: "number", minimum: 0, maximum: 100 },
            discountAmount: { type: "number", minimum: 0 },
            withGst: { type: "boolean" },
            supplyType: { type: "string", enum: ["INTRASTATE", "INTERSTATE"] },
            buyerGstin: { type: "string", maxLength: 15 },
            placeOfSupply: { type: "string", maxLength: 2 },
            reverseCharge: { type: "boolean" },
            tags: {
              type: "array",
              items: { type: "string", maxLength: 50 },
              maxItems: 10,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          customerId: string;
          items: Array<{
            productName: string;
            quantity: number;
            unitPrice?: number;
            lineDiscountPercent?: number;
            hsnCode?: string;
          }>;
          notes?: string;
          discountPercent?: number;
          discountAmount?: number;
          withGst?: boolean;
          supplyType?: "INTRASTATE" | "INTERSTATE";
          buyerGstin?: string;
          placeOfSupply?: string;
          reverseCharge?: boolean;
          tags?: string[];
        };
      }>,
      reply,
    ) => {
      const { customerId, items, notes, ...opts } = request.body;
      if (opts.withGst && opts.buyerGstin?.trim()) {
        const err = getGstinValidationError(opts.buyerGstin.trim());
        if (err) {
          return reply.code(400).send({
            error: "INVALID_GSTIN",
            message: err,
          });
        }
      }
      const result = await createInvoiceCommand.execute({
        customerId,
        items,
        notes,
        options: { ...opts, isProforma: true },
      });
      return reply.code(201).send({ invoice: result.invoice });
    },
  );

  // ── POST /api/v1/invoices/:id/convert — proforma → invoice ───────────────
  fastify.post<{
    Params: { id: string };
    Body: { amount?: number; method?: string };
  }>("/api/v1/invoices/:id/convert", async (request, _reply) => {
    const initialPayment = request.body?.amount
      ? {
          amount: request.body.amount,
          method: (request.body.method ?? "cash") as
            | "cash"
            | "upi"
            | "card"
            | "other",
        }
      : undefined;
    const invoice = await invoiceService.convertProformaToInvoice(
      request.params.id,
      initialPayment,
    );
    const tid = request.user!.tenantId;
    if (tid)
      broadcaster.send(tid, "invoice:confirmed", {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
      });
    // Fire-and-forget: re-generate PDF (confirmed, not proforma) + send email
    invoiceService
      .dispatchInvoicePdfEmail(invoice.id)
      .catch((err) =>
        fastify.log.error(
          { err, invoiceId: invoice.id },
          "invoice pdf/email dispatch failed on convert",
        ),
      );
    return { invoice };
  });

  // ── PATCH /api/v1/invoices/:id — edit pending invoice ────────────────────
  fastify.patch(
    "/api/v1/invoices/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["productName", "quantity"],
                properties: {
                  productName: { type: "string", minLength: 1, maxLength: 255 },
                  quantity: { type: "integer", minimum: 1 },
                  unitPrice: { type: "number", minimum: 0 },
                  lineDiscountPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                  hsnCode: { type: "string", maxLength: 8 },
                },
                additionalProperties: false,
              },
            },
            notes: { type: "string", maxLength: 1000 },
            discountPercent: { type: "number", minimum: 0, maximum: 100 },
            discountAmount: { type: "number", minimum: 0 },
            withGst: { type: "boolean" },
            supplyType: { type: "string", enum: ["INTRASTATE", "INTERSTATE"] },
            buyerGstin: { type: "string", maxLength: 15 },
            placeOfSupply: { type: "string", maxLength: 2 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          items?: Array<{
            productName: string;
            quantity: number;
            unitPrice?: number;
            lineDiscountPercent?: number;
            hsnCode?: string;
          }>;
          notes?: string;
          discountPercent?: number;
          discountAmount?: number;
          withGst?: boolean;
          supplyType?: "INTRASTATE" | "INTERSTATE";
          buyerGstin?: string;
          placeOfSupply?: string;
        };
      }>,
      reply,
    ) => {
      const { items, notes, ...optsRaw } = request.body;
      if (optsRaw.withGst && optsRaw.buyerGstin?.trim()) {
        const err = getGstinValidationError(optsRaw.buyerGstin.trim());
        if (err) {
          return reply.code(400).send({
            error: "INVALID_GSTIN",
            message: err,
          });
        }
      }
      const invoice = await invoiceService.updateInvoice(request.params.id, {
        items,
        notes,
        opts: optsRaw,
      });
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "invoice:updated", { invoiceId: invoice.id });
      return { invoice };
    },
  );

  // ── POST /api/v1/invoices/:id/cancel ─────────────────────────────────────
  fastify.post(
    "/api/v1/invoices/:id/cancel",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
    ) => {
      const invoice = await invoiceService.cancelInvoice(request.params.id);
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "invoice:cancelled", { invoiceId: invoice.id });
      return { invoice };
    },
  );

  // ── POST /api/v1/invoices/:id/reverse-payment — owner/admin only ───────────
  fastify.post(
    "/api/v1/invoices/:id/reverse-payment",
    {
      schema: {
        body: {
          type: "object",
          required: ["amount"],
          properties: { amount: { type: "number", minimum: 0.01 } },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { amount: number };
      }>,
      reply,
    ) => {
      const role = request.user!.role;
      if (role !== "owner" && role !== "admin") {
        return reply
          .code(403)
          .send({ error: "Only owner or admin can reverse payments" });
      }
      const result = await ledgerService.reversePayment(
        request.params.id,
        request.body.amount,
      );
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "payment:recorded", {
          invoiceId: request.params.id,
        });
      return result;
    },
  );

  // ── GET /api/v1/invoices/:id/portal-token — get public portal token ─────────
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/invoices/:id/portal-token",
    async (request, reply) => {
      const invoice = await invoiceService.getInvoiceById(request.params.id);
      if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
      return { token: makePortalToken(request.params.id) };
    },
  );

  // ── POST /api/v1/invoices/:id/send-email — (re-)send invoice PDF to customer ──
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/invoices/:id/send-email",
    async (request, reply) => {
      const invoice = await invoiceService.getInvoiceById(request.params.id);
      if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
      // Fire synchronously so the caller knows if it succeeded
      await invoiceService.dispatchInvoicePdfEmail(request.params.id);
      return { ok: true, invoiceId: request.params.id };
    },
  );

  // ── POST /api/v1/ledger/mixed-payment — cash+UPI split payment ────────────
  fastify.post(
    "/api/v1/ledger/mixed-payment",
    {
      schema: {
        body: {
          type: "object",
          required: ["customerId", "splits"],
          properties: {
            customerId: { type: "string", minLength: 1 },
            splits: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                required: ["amount", "method"],
                properties: {
                  amount: { type: "number", minimum: 0.01 },
                  method: {
                    type: "string",
                    enum: ["cash", "upi", "card", "other"],
                  },
                },
                additionalProperties: false,
              },
            },
            notes: { type: "string", maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          customerId: string;
          splits: Array<{
            amount: number;
            method: "cash" | "upi" | "card" | "other";
          }>;
          notes?: string;
        };
      }>,
      reply,
    ) => {
      const result = await ledgerService.recordMixedPayment(
        request.body.customerId,
        request.body.splits,
        request.body.notes,
      );
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "payment:recorded", {
          customerId: request.body.customerId,
        });
      return reply.code(201).send(result);
    },
  );
}
