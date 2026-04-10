"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardOverview = getDashboardOverview;
/**
 * reporting/dashboard/overview-cards
 *
 * Feature: top-line KPI cards for the home dashboard — revenue, outstanding,
 * invoices today, expenses, stock alerts.
 * Aggregates from multiple domain services.
 */
const invoice_1 = require("../../../sales/invoice");
const low_stock_1 = require("../../../inventory/alerts/low-stock");
async function getDashboardOverview(_tenantId, dateRange) {
    const [summary, lowStock] = await Promise.all([
        (0, invoice_1.getSummaryRange)(new Date(dateRange.from), new Date(dateRange.to)).catch(() => null),
        (0, low_stock_1.getLowStockProducts)().catch(() => []),
    ]);
    return {
        periodLabel: `${dateRange.from} – ${dateRange.to}`,
        totalRevenue: summary?.totalRevenue ?? 0,
        totalInvoices: summary?.invoiceCount ?? 0,
        totalOutstanding: summary?.outstanding ?? 0,
        totalExpenses: 0,
        lowStockCount: Array.isArray(lowStock) ? lowStock.length : 0,
        topProductCount: 0,
    };
}
//# sourceMappingURL=index.js.map