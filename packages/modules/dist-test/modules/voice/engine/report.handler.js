"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDailySummary = executeDailySummary;
exports.executeCheckStock = executeCheckStock;
/**
 * Report and query intent handlers.
 * Covers: DAILY_SUMMARY, CHECK_STOCK
 */
const infrastructure_1 = require("@execora/infrastructure");
const invoice_service_1 = require("../../invoice/invoice.service");
const product_service_1 = require("../../product/product.service");
const infrastructure_2 = require("@execora/infrastructure");
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
//# sourceMappingURL=report.handler.js.map