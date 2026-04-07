/**
 * Public customer-facing invoice portal routes.
 * NO authentication required — access is gated by the per-invoice HMAC token.
 *
 * GET /pub/invoice/:id/:token          — invoice data (JSON)
 * GET /pub/invoice/:id/:token/pdf      — redirect to fresh MinIO presigned URL
 */
import { FastifyInstance } from 'fastify';
import { verifyPortalToken, minioClient, prisma } from '@execora/core';

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

      // Portal: fetch by id only (token is auth). invoiceService.getInvoiceById uses tenantContext.
      const invoice = await prisma.invoice.findFirst({
        where: { id },
        include: { customer: true, items: true },
      });
      if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });

      // S12-04: Fetch tenant settings for UPI Pay Now link
      const tenant = await prisma.tenant.findFirst({
        where: { id: invoice.tenantId },
        select: { name: true, legalName: true, settings: true },
      });
      const settings = (tenant?.settings as Record<string, string> | null) ?? {};
      const upiVpa = settings.upiVpa || undefined;
      const shopName =
        settings.shopName ||
        tenant?.legalName ||
        tenant?.name ||
        'Execora Shop';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = invoice as any;
      return {
        invoice: {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          status: inv.status,
          isProforma: inv.isProforma,
          createdAt: inv.createdAt,
          dueDate: inv.dueDate,
          notes: inv.notes,
          subtotal: inv.subtotal,
          discountAmount: inv.discountAmount,
          taxAmount: inv.taxAmount,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          customer: inv.customer
            ? {
                name: inv.customer.name,
                phone: inv.customer.phone,
                email: inv.customer.email,
                address: inv.customer.address,
                gstin: inv.customer.gstin,
              }
            : null,
          items: inv.items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineDiscountPercent: item.lineDiscountPercent,
            lineTotal: item.lineTotal,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
          })),
          hasPdf: !!inv.pdfObjectKey,
          upiVpa,
          shopName,
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

      const invoice = await prisma.invoice.findFirst({ where: { id } });
      if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });

      if (!invoice.pdfObjectKey) {
        return reply.code(202).send({ status: 'pending', message: 'PDF is being generated. Retry shortly.' });
      }

      // Fresh 1-hour presigned URL — avoids serving a stored (possibly expired) URL
      const url = await minioClient.getPresignedUrl(invoice.pdfObjectKey!, 3600);
      return reply.redirect(url);
    }
  );
}
