"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDailySummary = executeDailySummary;
exports.executeCheckStock = executeCheckStock;
exports.executeExportGstr1 = executeExportGstr1;
exports.executeExportPnl = executeExportPnl;
/**
 * Report and query intent handlers.
 * Covers: DAILY_SUMMARY, CHECK_STOCK, EXPORT_GSTR1, EXPORT_PNL
 */
const infrastructure_1 = require("@execora/infrastructure");
const invoice_service_1 = require("../../invoice/invoice.service");
const product_service_1 = require("../../product/product.service");
const infrastructure_2 = require("@execora/infrastructure");
const gstr1_service_1 = require("../../gst/gstr1.service");
// ── DAILY_SUMMARY ────────────────────────────────────────────────────────────
async function executeDailySummary() {
    const summary = await invoice_service_1.invoiceService.getDailySummary();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && infrastructure_2.emailService.isEnabled()) {
        const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        infrastructure_2.emailService.sendDailySummaryEmail(adminEmail, {
            date: today,
            totalSales: Number(summary.totalSales ?? 0),
            invoiceCount: Number(summary.invoiceCount ?? 0),
            paymentsReceived: Number(summary.totalPayments ?? 0),
            pendingAmount: Number(summary.pendingAmount ?? 0),
            newCustomers: 0,
        }).catch((err) => infrastructure_1.logger.error({ err }, 'Failed to send daily summary email'));
    }
    const extraPayments = summary.extraPayments ?? 0;
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
async function executeCheckStock(entities) {
    const productQuery = entities.product || entities.productName || entities.name;
    if (!productQuery) {
        return { success: false, message: 'Product name batao — kaunsa stock check karna hai?', error: 'MISSING_PRODUCT' };
    }
    const stock = await product_service_1.productService.getStock(productQuery);
    return {
        success: true,
        message: `${productQuery} ka stock ${stock} units hai`,
        data: { product: productQuery, stock },
    };
}
// ── EXPORT_GSTR1 ──────────────────────────────────────────────────────────────
async function executeExportGstr1(entities) {
    const { tenantId } = infrastructure_1.tenantContext.get();
    // Resolve date range: FY from entities or default to current FY
    let from, to;
    if (entities.fy) {
        const range = (0, gstr1_service_1.indianFYRange)(String(entities.fy));
        from = range.from;
        to = range.to;
    }
    else if (entities.from && entities.to) {
        from = new Date(entities.from);
        to = new Date(entities.to);
    }
    else {
        const range = (0, gstr1_service_1.indianFYRange)((0, gstr1_service_1.getIndianFY)());
        from = range.from;
        to = range.to;
    }
    const report = await gstr1_service_1.gstr1Service.getGstr1Report(tenantId, from, to);
    const { totals } = report;
    const canEmail = infrastructure_2.emailService.isEnabled();
    const adminEmail = entities.email ?? process.env.ADMIN_EMAIL;
    const msg = [
        `GSTR-1 FY ${report.fy}: ${totals.invoiceCount} invoices,`,
        `taxable ₹${totals.totalTaxableValue.toLocaleString('en-IN')},`,
        `tax ₹${totals.totalTaxValue.toLocaleString('en-IN')}.`,
        canEmail && adminEmail
            ? `Reports tab se email karo ya PDF download karo.`
            : 'Reports tab se PDF download karo.',
    ].join(' ');
    infrastructure_1.logger.info({ tenantId, fy: report.fy, invoiceCount: totals.invoiceCount }, 'EXPORT_GSTR1 intent executed');
    return {
        success: true,
        message: msg,
        data: {
            fy: report.fy,
            from: from.toISOString(),
            to: to.toISOString(),
            totals,
            downloadUrl: '/reports?tab=gstr1',
            emailAvailable: canEmail,
        },
    };
}
// ── EXPORT_PNL ────────────────────────────────────────────────────────────────
async function executeExportPnl(entities) {
    const { tenantId } = infrastructure_1.tenantContext.get();
    // Resolve date range — supports "month" entity or explicit from/to
    let from, to;
    const monthNames = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
        jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    if (entities.month) {
        const monthStr = String(entities.month).toLowerCase();
        const now = new Date();
        const monthIdx = monthNames[monthStr] ?? now.getMonth();
        const year = entities.year
            ? Number(entities.year)
            : (monthIdx > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear());
        from = new Date(year, monthIdx, 1);
        to = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
    }
    else if (entities.from && entities.to) {
        from = new Date(entities.from);
        to = new Date(entities.to);
    }
    else {
        // Default: current month
        const now = new Date();
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    const report = await gstr1_service_1.gstr1Service.getPnlReport(tenantId, from, to);
    const { totals } = report;
    const collectionRate = totals.collectionRate.toFixed(1);
    const monthLabel = from.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    const canEmail = infrastructure_2.emailService.isEnabled();
    const msg = [
        `P&L ${monthLabel}:`,
        `Revenue ₹${totals.revenue.toLocaleString('en-IN')},`,
        `collected ₹${totals.collected.toLocaleString('en-IN')} (${collectionRate}%).`,
        totals.outstanding > 0 ? `₹${totals.outstanding.toLocaleString('en-IN')} baki hai.` : 'Sab clear hai.',
        canEmail ? 'Reports tab se email ya PDF download karo.' : 'Reports tab se download karo.',
    ].join(' ');
    infrastructure_1.logger.info({ tenantId, from: from.toISOString(), totals }, 'EXPORT_PNL intent executed');
    return {
        success: true,
        message: msg,
        data: {
            from: from.toISOString(),
            to: to.toISOString(),
            totals,
            downloadUrl: '/reports?tab=pnl',
            emailAvailable: canEmail,
        },
    };
}
//# sourceMappingURL=report.handler.js.map