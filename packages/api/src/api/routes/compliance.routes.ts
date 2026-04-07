/**
 * Compliance routes — e-Invoicing, e-Way Bill, GST compliance
 *
 * GET  /api/v1/compliance/einvoice/eligibility   — check e-invoice mandate eligibility
 * POST /api/v1/compliance/einvoice/check         — check invoice eligibility by ID
 * GET  /api/v1/compliance/gstr3b                 — GSTR-3B summary for a period
 * POST /api/v1/compliance/ewaybill               — generate e-Way Bill for invoice
 * GET  /api/v1/compliance/ewaybill/:ewbNo        — get e-Way Bill status
 *
 * All routes require JWT auth (inherited from parent scope).
 */
import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma, logger } from "@execora/core";

// E-invoicing mandate thresholds (CBIC as of FY2024-25):
// >= 5 Cr  → mandatory since Aug 2023
// >= 10 Cr → mandatory since Oct 2022
// >= 20 Cr → mandatory since Apr 2022
function checkEInvoicingEligibility(turnoverCr: number): {
  eligible: boolean;
  mandatory: boolean;
  threshold: number | null;
  message: string;
} {
  if (turnoverCr >= 5) {
    return { eligible: true, mandatory: true, threshold: 5, message: "Mandatory for turnover >= 5 Cr" };
  }
  return { eligible: false, mandatory: false, threshold: null, message: "E-invoicing not mandatory below 5 Cr turnover" };
}

export async function complianceRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/compliance/einvoice/eligibility ───────────────────────────
  // Returns whether the tenant is eligible/mandated for e-invoicing.
  // Requires ?turnoverCr=<number> (annual turnover in Crores INR).
  fastify.get(
    "/api/v1/compliance/einvoice/eligibility",
    async (
      request: FastifyRequest<{ Querystring: { turnoverCr?: string } }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const raw = parseFloat(request.query.turnoverCr ?? "0");
      if (!Number.isFinite(raw) || raw < 0) {
        return reply
          .code(400)
          .send({
            error: "turnoverCr must be a non-negative number (Crores INR)",
          });
      }
      const result = checkEInvoicingEligibility(raw);
      return { tenantId, ...result };
    },
  );

  // ── POST /api/v1/compliance/einvoice/check ────────────────────────────────
  // Check whether a specific invoice qualifies for e-invoicing.
  fastify.post(
    "/api/v1/compliance/einvoice/check",
    {
      schema: {
        body: {
          type: "object",
          required: ["invoiceId"],
          properties: {
            invoiceId: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request: FastifyRequest<{ Body: { invoiceId: string } }>, reply) => {
      const tenantId = request.user!.tenantId;
      const invoice = await prisma.invoice.findFirst({
        where: { id: request.body.invoiceId, tenantId },
        select: {
          id: true,
          total: true,
          status: true,
          customerId: true,
        },
      });
      if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
      const eligible = invoice.status !== "cancelled" && Number(invoice.total) >= 0;
      return {
        invoiceId: invoice.id,
        eligible,
        reason: eligible
          ? "Invoice is eligible for e-invoicing"
          : "Cancelled invoices are not eligible",
      };
    },
  );

  // ── GET /api/v1/compliance/gstr3b ─────────────────────────────────────────
  // Returns GSTR-3B summarized tax liability for a period (?from=&to= or ?fy=).
  fastify.get(
    "/api/v1/compliance/gstr3b",
    async (
      request: FastifyRequest<{
        Querystring: { from?: string; to?: string; fy?: string };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      let from: Date, to: Date;

      if (request.query.fy) {
        // Parse Indian FY e.g. "2025-26"
        const match = /^(\d{4})-(\d{2})$/.exec(request.query.fy);
        if (!match)
          return reply
            .code(400)
            .send({ error: "Invalid fy format — use YYYY-YY e.g. 2025-26" });
        from = new Date(`${match[1]}-04-01`);
        to = new Date(`20${match[2]}-03-31T23:59:59.999Z`);
      } else if (request.query.from && request.query.to) {
        from = new Date(request.query.from);
        to = new Date(request.query.to);
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
          return reply
            .code(400)
            .send({ error: "Invalid date format — use YYYY-MM-DD" });
        }
      } else {
        // Default: current month
        const now = new Date();
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          status: { in: ["pending", "partial", "paid"] },
          createdAt: { gte: from, lte: to },
        },
        select: { tax: true, total: true, subtotal: true, cgst: true, sgst: true, igst: true },
      });

      let totalTaxable = 0,
        totalCgst = 0,
        totalSgst = 0,
        totalIgst = 0,
        totalTax = 0;
      for (const inv of invoices) {
        totalTaxable += Number(inv.subtotal);
        totalTax += Number(inv.tax);
        totalCgst += Number(inv.cgst);
        totalSgst += Number(inv.sgst);
        totalIgst += Number(inv.igst);
      }

      return {
        period: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        },
        invoiceCount: invoices.length,
        totalTaxableValue: Math.round(totalTaxable * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        note: "CGST/SGST split is approximate. For precise filing, use GSTR-1 export.",
      };
    },
  );

  // ── POST /api/v1/compliance/ewaybill ─────────────────────────────────────
  // Submit e-Way Bill generation request for an invoice.
  // Returns stub response (NIC API integration pending).
  fastify.post(
    "/api/v1/compliance/ewaybill",
    {
      schema: {
        body: {
          type: "object",
          required: ["invoiceId"],
          properties: {
            invoiceId: { type: "string", minLength: 1 },
            transMode: {
              type: "string",
              enum: ["1", "2", "3", "4"],
              description: "1=Road,2=Rail,3=Air,4=Ship",
            },
            vehicleNo: { type: "string", maxLength: 20 },
            distance: { type: "number", minimum: 1 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          invoiceId: string;
          transMode?: string;
          vehicleNo?: string;
          distance?: number;
        };
      }>,
      reply,
    ) => {
      const tenantId = request.user!.tenantId;
      const invoice = await prisma.invoice.findFirst({
        where: { id: request.body.invoiceId, tenantId },
        select: { id: true, invoiceNo: true, total: true, status: true },
      });
      if (!invoice) return reply.code(404).send({ error: "Invoice not found" });
      if (invoice.status === "cancelled") {
        return reply
          .code(422)
          .send({ error: "Cannot generate e-Way Bill for cancelled invoice" });
      }
      logger.info(
        { tenantId, invoiceId: invoice.id },
        "e-Way Bill generation requested (NIC integration pending)",
      );
      // Stub response — real NIC API call pending
      return reply.code(202).send({
        status: "pending",
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        message:
          "e-Way Bill API integration with NIC is pending. Set up NIC credentials to enable.",
      });
    },
  );

  // ── GET /api/v1/compliance/ewaybill/:ewbNo ────────────────────────────────
  fastify.get<{ Params: { ewbNo: string } }>(
    "/api/v1/compliance/ewaybill/:ewbNo",
    async (_request, reply) => {
      // Stub — NIC sync not yet configured
      return reply.code(501).send({
        error:
          "e-Way Bill status sync not yet configured. Set up NIC credentials first.",
      });
    },
  );
}
