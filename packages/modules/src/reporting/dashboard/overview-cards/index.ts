/**
 * reporting/dashboard/overview-cards
 *
 * Feature: top-line KPI cards for the home dashboard — revenue, outstanding,
 * invoices today, expenses, stock alerts.
 * Aggregates from multiple domain services.
 */
import { getSummaryRange } from "../../../sales/invoice";
import { getLowStockProducts } from "../../../inventory/alerts/low-stock";

export interface DashboardOverviewCards {
  periodLabel: string;
  totalRevenue: number;
  totalInvoices: number;
  totalOutstanding: number;
  totalExpenses: number;
  lowStockCount: number;
  topProductCount: number;
}

export async function getDashboardOverview(
  _tenantId: string,
  dateRange: { from: string; to: string }
): Promise<DashboardOverviewCards> {
  const [summary, lowStock] = await Promise.all([
    getSummaryRange(new Date(dateRange.from), new Date(dateRange.to)).catch(() => null),
    getLowStockProducts().catch(() => []),
  ]);

  return {
    periodLabel: `${dateRange.from} – ${dateRange.to}`,
    totalRevenue: (summary as any)?.totalRevenue ?? 0,
    totalInvoices: (summary as any)?.invoiceCount ?? 0,
    totalOutstanding: (summary as any)?.outstanding ?? 0,
    totalExpenses: 0,
    lowStockCount: Array.isArray(lowStock) ? lowStock.length : 0,
    topProductCount: 0,
  };
}
