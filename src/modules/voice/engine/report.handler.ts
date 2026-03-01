/**
 * Report and query intent handlers.
 * Covers: DAILY_SUMMARY, CHECK_STOCK
 */
import { logger } from '../../../infrastructure/logger';
import { invoiceService } from '../../invoice/invoice.service';
import { productService } from '../../product/product.service';
import { emailService } from '../../../infrastructure/email';
import type { ExecutionResult } from '../../../types';

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
