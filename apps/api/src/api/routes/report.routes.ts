/**
 * Report routes — GSTR-1 and P&L exports
 *
 * All routes require JWT auth (set via parent scope in api/index.ts).
 * Tenant is inferred from request.user.tenantId.
 *
 * GET  /api/v1/reports/gstr1              — GSTR-1 JSON data
 * GET  /api/v1/reports/gstr1/pdf          — GSTR-1 PDF download
 * GET  /api/v1/reports/gstr1/csv          — GSTR-1 CSV (section=b2b|b2cs|hsn)
 * GET  /api/v1/reports/pnl               — P&L JSON data
 * GET  /api/v1/reports/pnl/pdf           — P&L PDF download
 * GET  /api/v1/reports/pnl/csv           — P&L CSV
 * POST /api/v1/reports/email             — Email a report as PDF attachment
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gstr1Service, getIndianFY, indianFYRange } from '@execora/modules';
import { generateGstr1Pdf, generatePnlPdf, emailService, prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';

interface ReportQuerystring {
  from?: string;
  to?: string;
  fy?: string;          // Indian FY e.g. "2025-26" (auto-computes from/to if set)
}

interface Gstr1CsvQuerystring extends ReportQuerystring {
  section?: 'b2b' | 'b2cs' | 'hsn';
}

interface EmailBody {
  type: 'gstr1' | 'pnl';
  from: string;
  to: string;
  email: string;
  fy?: string;
  compareFrom?: string;
  compareTo?: string;
}

/** Parse and validate a date range from request query. Returns null if invalid. */
function resolveDateRange(q: ReportQuerystring, reply: FastifyReply): { from: Date; to: Date } | null {
  let from: Date, to: Date;

  if (q.fy) {
    const range = indianFYRange(q.fy);
    from = range.from;
    to   = range.to;
  } else if (q.from && q.to) {
    from = new Date(q.from);
    to   = new Date(q.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      reply.code(400).send({ error: 'Invalid date format — use YYYY-MM-DD or fy=2025-26' });
      return null;
    }
  } else {
    // Default: current Indian FY
    const range = indianFYRange(getIndianFY());
    from = range.from;
    to   = range.to;
  }

  return { from, to };
}

/** Build a CSV string from an array of objects */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines   = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const v = String(row[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    });
    lines.push(values.join(','));
  }
  return lines.join('\r\n');
}

export async function reportRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/reports/gstr1 ─────────────────────────────────────────────
  fastify.get('/api/v1/reports/gstr1', async (
    request: FastifyRequest<{ Querystring: ReportQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const report = await gstr1Service.getGstr1Report(tenantId, range.from, range.to);
    return { report };
  });

  // ── GET /api/v1/reports/gstr1/pdf ─────────────────────────────────────────
  fastify.get('/api/v1/reports/gstr1/pdf', async (
    request: FastifyRequest<{ Querystring: ReportQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const report = await gstr1Service.getGstr1Report(tenantId, range.from, range.to);
    const pdf    = await generateGstr1Pdf(report);
    const fy     = report.fy.replace('-', '_');
    const filename = `GSTR1_${fy}.pdf`;

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdf);
  });

  // ── GET /api/v1/reports/gstr1/csv ─────────────────────────────────────────
  fastify.get('/api/v1/reports/gstr1/csv', async (
    request: FastifyRequest<{ Querystring: Gstr1CsvQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const report  = await gstr1Service.getGstr1Report(tenantId, range.from, range.to);
    const section = request.query.section ?? 'b2b';
    const fy      = report.fy.replace('-', '_');

    let rows: Record<string, unknown>[];
    let filename: string;

    if (section === 'b2cs') {
      rows = report.b2cs.map((r) => ({
        'Supply Type':    r.supplyType,
        'Place of Supply': r.placeOfSupply,
        'GST Rate (%)':   r.gstRate,
        'Taxable Value':  r.taxableValue,
        'IGST':           r.igst,
        'CGST':           r.cgst,
        'SGST':           r.sgst,
        'CESS':           r.cess,
      }));
      filename = `GSTR1_B2CS_${fy}.csv`;
    } else if (section === 'hsn') {
      rows = report.hsn.map((r) => ({
        'HSN Code':      r.hsnCode,
        'Description':   r.description,
        'UQC':           r.uqc,
        'Total Quantity': r.totalQty,
        'GST Rate (%)':  r.gstRate,
        'Taxable Value': r.taxableValue,
        'IGST':          r.igst,
        'CGST':          r.cgst,
        'SGST':          r.sgst,
      }));
      filename = `GSTR1_HSN_${fy}.csv`;
    } else {
      // Default: B2B
      rows = report.b2b.map((r) => ({
        'Receiver GSTIN': r.receiverGstin,
        'Receiver Name':  r.receiverName,
        'Invoice No':     r.invoiceNo,
        'Invoice Date':   r.invoiceDate,
        'Place of Supply': r.placeOfSupply,
        'Invoice Value':  r.invoiceValue,
        'Taxable Value':  r.taxableValue,
        'IGST':           r.igst,
        'CGST':           r.cgst,
        'SGST':           r.sgst,
        'CESS':           r.cess,
        'Reverse Charge': r.reverseCharge,
      }));
      filename = `GSTR1_B2B_${fy}.csv`;
    }

    const csv = toCsv(rows);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send('\uFEFF' + csv); // BOM for Excel compatibility
  });

  // ── GET /api/v1/reports/itemwise-pnl ───────────────────────────────────────
  fastify.get('/api/v1/reports/itemwise-pnl', async (
    request: FastifyRequest<{ Querystring: ReportQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const report = await gstr1Service.getItemwisePnlReport(tenantId, range.from, range.to);
    return { report };
  });

  // ── GET /api/v1/reports/pnl ───────────────────────────────────────────────
  fastify.get('/api/v1/reports/pnl', async (
    request: FastifyRequest<{
      Querystring: ReportQuerystring & { compareFrom?: string; compareTo?: string };
    }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    let compareFrom: Date | undefined;
    let compareTo:   Date | undefined;

    if (request.query.compareFrom && request.query.compareTo) {
      compareFrom = new Date(request.query.compareFrom);
      compareTo   = new Date(request.query.compareTo);
    }

    const report = await gstr1Service.getPnlReport(tenantId, range.from, range.to, compareFrom, compareTo);
    return { report };
  });

  // ── GET /api/v1/reports/pnl/pdf ───────────────────────────────────────────
  fastify.get('/api/v1/reports/pnl/pdf', async (
    request: FastifyRequest<{ Querystring: ReportQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { tradeName: true, name: true },
    });
    const shopName = tenant?.tradeName ?? tenant?.name ?? '';

    const report = await gstr1Service.getPnlReport(tenantId, range.from, range.to);
    const pdf    = await generatePnlPdf({ ...report, shopName });

    const fromLabel = range.from.toISOString().slice(0, 10);
    const toLabel   = range.to.toISOString().slice(0, 10);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="PnL_${fromLabel}_${toLabel}.pdf"`)
      .send(pdf);
  });

  // ── GET /api/v1/reports/pnl/csv ───────────────────────────────────────────
  fastify.get('/api/v1/reports/pnl/csv', async (
    request: FastifyRequest<{ Querystring: ReportQuerystring }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const range = resolveDateRange(request.query, reply);
    if (!range) return;

    const report = await gstr1Service.getPnlReport(tenantId, range.from, range.to);

    const rows: Record<string, unknown>[] = [
      ...report.months.map((m) => ({
        'Month':         m.month,
        'Invoice Count': m.invoiceCount,
        'Revenue':       m.revenue,
        'Discounts':     m.discounts,
        'Net Revenue':   m.netRevenue,
        'Tax Collected': m.taxCollected,
        'Collected':     m.collected,
        'Outstanding':   m.outstanding,
      })),
      {
        'Month':         'TOTAL',
        'Invoice Count': report.totals.invoiceCount,
        'Revenue':       report.totals.revenue,
        'Discounts':     report.totals.discounts,
        'Net Revenue':   report.totals.netRevenue,
        'Tax Collected': report.totals.taxCollected,
        'Collected':     report.totals.collected,
        'Outstanding':   report.totals.outstanding,
      },
    ];

    const fromLabel = range.from.toISOString().slice(0, 10);
    const toLabel   = range.to.toISOString().slice(0, 10);
    const csv = toCsv(rows);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="PnL_${fromLabel}_${toLabel}.csv"`)
      .send('\uFEFF' + csv);
  });

  // ── POST /api/v1/reports/email ─────────────────────────────────────────────
  fastify.post('/api/v1/reports/email', async (
    request: FastifyRequest<{ Body: EmailBody }>,
    reply,
  ) => {
    const tenantId = request.user!.tenantId;
    const { type, from, to, email, compareFrom, compareTo } = request.body;

    if (!type || !from || !to || !email) {
      return reply.code(400).send({ error: 'Missing required fields: type, from, to, email' });
    }

    if (!emailService.isEnabled()) {
      return reply.code(503).send({ error: 'Email service not configured on this server' });
    }

    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return reply.code(400).send({ error: 'Invalid date format' });
    }

    const fromStr = fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const toStr   = toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let pdfBuffer: Buffer;
    let subject: string;
    let filename: string;
    let htmlBody: string;

    if (type === 'gstr1') {
      const report = await gstr1Service.getGstr1Report(tenantId, fromDate, toDate);
      pdfBuffer  = await generateGstr1Pdf(report);
      subject    = `GSTR-1 Report FY ${report.fy} (${fromStr} – ${toStr})`;
      filename   = `GSTR1_${report.fy.replace('-', '_')}.pdf`;
      htmlBody   = buildGstr1EmailHtml(report, fromStr, toStr);
    } else {
      const tenant = await prisma.tenant.findUnique({
        where:  { id: tenantId },
        select: { tradeName: true, name: true },
      });
      const shopName  = tenant?.tradeName ?? tenant?.name ?? '';
      let compareFromDate: Date | undefined;
      let compareToDate: Date | undefined;
      if (compareFrom && compareTo) {
        compareFromDate = new Date(compareFrom);
        compareToDate   = new Date(compareTo);
      }
      const report = await gstr1Service.getPnlReport(tenantId, fromDate, toDate, compareFromDate, compareToDate);
      pdfBuffer  = await generatePnlPdf({ ...report, shopName });
      subject    = `P&L Report (${fromStr} – ${toStr})`;
      filename   = `PnL_${from}_${to}.pdf`;
      htmlBody   = buildPnlEmailHtml(report, shopName, fromStr, toStr);
    }

    const sent = await emailService.sendEmail({
      to:      email,
      subject,
      html:    htmlBody,
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
    });

    if (!sent) {
      return reply.code(500).send({ error: 'Failed to send email' });
    }

    logger.info({ tenantId, type, email }, 'Report emailed successfully');
    return { success: true, message: `Report emailed to ${email}` };
  });
}

// ── Email HTML builders ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildGstr1EmailHtml(report: any, fromStr: string, toStr: string): string {
  const t = report.totals;
  const INR = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: #0f172a; color: #fff; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">GSTR-1 Report</h2>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">FY ${report.fy} &nbsp;|&nbsp; ${fromStr} – ${toStr}</p>
        ${report.gstin ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">GSTIN: ${report.gstin}</p>` : ''}
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #475569;">SUMMARY</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr><td style="padding: 6px 0; color: #64748b;">Total Invoices</td><td style="text-align: right; font-weight: bold;">${t.invoiceCount}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Taxable Value</td><td style="text-align: right; font-weight: bold;">${INR(t.totalTaxableValue)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Total CGST</td><td style="text-align: right;">${INR(t.totalCgst)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Total SGST</td><td style="text-align: right;">${INR(t.totalSgst)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Total IGST</td><td style="text-align: right;">${INR(t.totalIgst)}</td></tr>
          <tr style="border-top: 2px solid #0f766e;"><td style="padding: 8px 0; font-weight: bold; color: #0f766e;">Total Tax</td><td style="text-align: right; font-weight: bold; color: #0f766e;">${INR(t.totalTaxValue)}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Total Invoice Value</td><td style="text-align: right; font-weight: bold;">${INR(t.totalInvoiceValue)}</td></tr>
        </table>
      </div>
      <div style="padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">The complete GSTR-1 report is attached as a PDF. Please file it on the GST portal before the due date.</p>
        <p style="margin: 8px 0 0;">Generated by Execora &bull; ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
    </div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPnlEmailHtml(report: any, shopName: string, fromStr: string, toStr: string): string {
  const t = report.totals;
  const INR = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: #0f172a; color: #fff; padding: 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Profit & Loss Report</h2>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">${shopName} &nbsp;|&nbsp; ${fromStr} – ${toStr}</p>
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #475569;">PERIOD SUMMARY</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr><td style="padding: 6px 0; color: #64748b;">Total Invoices</td><td style="text-align: right; font-weight: bold;">${t.invoiceCount}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Revenue</td><td style="text-align: right; font-weight: bold;">${INR(t.revenue)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Discounts Given</td><td style="text-align: right;">${INR(t.discounts)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Net Revenue</td><td style="text-align: right; font-weight: bold;">${INR(t.netRevenue)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Tax Collected</td><td style="text-align: right;">${INR(t.taxCollected)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Amount Collected</td><td style="text-align: right;">${INR(t.collected)}</td></tr>
          <tr style="border-top: 2px solid #dc2626;"><td style="padding: 8px 0; font-weight: bold; color: #dc2626;">Outstanding</td><td style="text-align: right; font-weight: bold; color: #dc2626;">${INR(t.outstanding)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Collection Rate</td><td style="text-align: right; font-weight: bold;">${t.collectionRate.toFixed(1)}%</td></tr>
        </table>
      </div>
      <div style="padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">The month-wise P&L breakdown is attached as a PDF.</p>
        <p style="margin: 8px 0 0;">Generated by Execora &bull; ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
    </div>`;
}
