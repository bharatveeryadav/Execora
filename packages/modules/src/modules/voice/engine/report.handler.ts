/**
 * Report and query intent handlers.
 * Covers: DAILY_SUMMARY, CHECK_STOCK, EXPORT_GSTR1, EXPORT_PNL
 */
import { logger, tenantContext } from '@execora/core';
import { invoiceService } from '../../invoice/invoice.service';
import { productService } from '../../product/product.service';
import { emailService } from '../../../infra/email';
import { gstr1Service, getIndianFY, indianFYRange } from '../../gst/gstr1.service';
import type { ExecutionResult } from '@execora/types';

// ── DAILY_SUMMARY ────────────────────────────────────────────────────────────

export async function executeDailySummary(): Promise<ExecutionResult> {
  const summary = await invoiceService.getDailySummary();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && emailService.isEnabled()) {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    emailService.sendDailySummaryEmail(adminEmail, {
      date:             today,
      totalSales:       Number(summary.totalSales    ?? 0),
      invoiceCount:     Number(summary.invoiceCount  ?? 0),
      paymentsReceived: Number(summary.totalPayments ?? 0),
      pendingAmount:    Number(summary.pendingAmount ?? 0),
      newCustomers:     0,
    }).catch((err) => logger.error({ err }, 'Failed to send daily summary email'));
  }

  const extraPayments = (summary as any).extraPayments ?? 0;
  const summaryMsg = [
    `Aaj ka summary:`,
    `Sales ₹${summary.totalSales} (${summary.invoiceCount} invoices),`,
    `payments ₹${summary.totalPayments}.`,
    summary.pendingAmount > 0
      ? `Pending ₹${summary.pendingAmount} abhi baki hai.`
      : extraPayments > 0
        ? `Sab sales clear — ₹${extraPayments} purana udhaar bhi wapas aaya.`
        : `Sab clear hai.`,
  ].join(' ');

  return { success: true, message: summaryMsg, data: summary };
}

// ── CHECK_STOCK ──────────────────────────────────────────────────────────────

export async function executeCheckStock(entities: Record<string, any>): Promise<ExecutionResult> {
  const productQuery = entities.product || entities.productName || entities.name;
  if (!productQuery) {
    return { success: false, message: 'Product name batao — kaunsa stock check karna hai?', error: 'MISSING_PRODUCT' };
  }

  const stock = await productService.getStock(productQuery);
  return {
    success: true,
    message: `${productQuery} ka stock ${stock} units hai`,
    data: { product: productQuery, stock },
  };
}

// ── EXPORT_GSTR1 ──────────────────────────────────────────────────────────────

export async function executeExportGstr1(entities: Record<string, any>): Promise<ExecutionResult> {
  const { tenantId } = tenantContext.get();

  // Resolve date range: FY from entities or default to current FY
  let from: Date, to: Date;
  if (entities.fy) {
    const range = indianFYRange(String(entities.fy));
    from = range.from;
    to   = range.to;
  } else if (entities.from && entities.to) {
    from = new Date(entities.from as string);
    to   = new Date(entities.to as string);
  } else {
    const range = indianFYRange(getIndianFY());
    from = range.from;
    to   = range.to;
  }

  const report  = await gstr1Service.getGstr1Report(tenantId, from, to);
  const { totals } = report;

  const canEmail = emailService.isEnabled();
  const adminEmail = (entities.email as string | undefined) ?? process.env.ADMIN_EMAIL;

  const msg = [
    `GSTR-1 FY ${report.fy}: ${totals.invoiceCount} invoices,`,
    `taxable ₹${totals.totalTaxableValue.toLocaleString('en-IN')},`,
    `tax ₹${totals.totalTaxValue.toLocaleString('en-IN')}.`,
    canEmail && adminEmail
      ? `Reports tab se email karo ya PDF download karo.`
      : 'Reports tab se PDF download karo.',
  ].join(' ');

  logger.info({ tenantId, fy: report.fy, invoiceCount: totals.invoiceCount }, 'EXPORT_GSTR1 intent executed');

  return {
    success: true,
    message: msg,
    data: {
      fy: report.fy,
      from: from.toISOString(),
      to:   to.toISOString(),
      totals,
      downloadUrl: '/reports?tab=gstr1',
      emailAvailable: canEmail,
    },
  };
}

// ── EXPORT_PNL ────────────────────────────────────────────────────────────────

export async function executeExportPnl(entities: Record<string, any>): Promise<ExecutionResult> {
  const { tenantId } = tenantContext.get();

  // Resolve date range — supports "month" entity or explicit from/to
  let from: Date, to: Date;
  const monthNames: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  if (entities.month) {
    const monthStr = String(entities.month).toLowerCase();
    const now      = new Date();
    const monthIdx = monthNames[monthStr] ?? now.getMonth();
    const year     = entities.year
      ? Number(entities.year)
      : (monthIdx > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear());
    from = new Date(year, monthIdx, 1);
    to   = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  } else if (entities.from && entities.to) {
    from = new Date(entities.from as string);
    to   = new Date(entities.to as string);
  } else {
    // Default: current month
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const report  = await gstr1Service.getPnlReport(tenantId, from, to);
  const { totals } = report;

  const collectionRate = totals.collectionRate.toFixed(1);
  const monthLabel     = from.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  const canEmail       = emailService.isEnabled();

  const msg = [
    `P&L ${monthLabel}:`,
    `Revenue ₹${totals.revenue.toLocaleString('en-IN')},`,
    `collected ₹${totals.collected.toLocaleString('en-IN')} (${collectionRate}%).`,
    totals.outstanding > 0 ? `₹${totals.outstanding.toLocaleString('en-IN')} baki hai.` : 'Sab clear hai.',
    canEmail ? 'Reports tab se email ya PDF download karo.' : 'Reports tab se download karo.',
  ].join(' ');

  logger.info({ tenantId, from: from.toISOString(), totals }, 'EXPORT_PNL intent executed');

  return {
    success: true,
    message: msg,
    data: {
      from: from.toISOString(),
      to:   to.toISOString(),
      totals,
      downloadUrl: '/reports?tab=pnl',
      emailAvailable: canEmail,
    },
  };
}
