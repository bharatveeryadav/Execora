/**
 * Public customer-facing invoice portal routes.
 * NO authentication required — access is gated by the per-invoice HMAC token.
 *
 * GET /pub/invoice/:id/:token          — invoice data (JSON)
 * GET /pub/invoice/:id/:token/pdf      — redirect to fresh MinIO presigned URL
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { invoiceService } from '@execora/modules';
import { verifyPortalToken, minioClient } from '@execora/infrastructure';

type PortalParams = { id: string; token: string };

export async function portalRoutes(fastify: FastifyInstance) {
  // ── GET /pub/invoice/:id/:token ───────────────────────────────────────────
  fastify.get<{ Params: PortalParams }>(
    '/pub/invoice/:id/:token',
    async (request, reply) => {
      const { id, token } = request.params;

      if (!verifyPortalToken(id, token)) {
        return reply.code(403).send({ error: 'Invalid or expired link' });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = await invoiceService.getInvoiceById(id) as any;
      if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });

      // Return a sanitised subset — no internal tenant IDs
      return {
        invoice: {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          status: invoice.status,
          isProforma: invoice.isProforma,
          createdAt: invoice.createdAt,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          // Totals
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          // Customer
          customer: invoice.customer
            ? {
                name: invoice.customer.name,
                phone: invoice.customer.phone,
                email: invoice.customer.email,
                address: invoice.customer.address,
                gstin: invoice.customer.gstin,
              }
            : null,
          // Line items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: invoice.items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineDiscountPercent: item.lineDiscountPercent,
            lineTotal: item.lineTotal,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
          })),
          // PDF availability flag
          hasPdf: !!invoice.pdfObjectKey,
        },
      };
    }
  );

  // ── GET /pub/invoice/:id/:token/pdf ───────────────────────────────────────
  fastify.get<{ Params: PortalParams }>(
    '/pub/invoice/:id/:token/pdf',
    async (request, reply) => {
      const { id, token } = request.params;

      if (!verifyPortalToken(id, token)) {
        return reply.code(403).send({ error: 'Invalid or expired link' });
      }

      const invoice = await invoiceService.getInvoiceById(id);
      if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });

      if (!invoice.pdfObjectKey) {
        return reply.code(404).send({ error: 'PDF not yet generated' });
      }

      // Fresh 1-hour presigned URL — avoids serving a stored (possibly expired) URL
      const url = await minioClient.getPresignedUrl(invoice.pdfObjectKey, 3600);
      return reply.redirect(url);
    }
  );
}
