/**
 * reporting/sales-reports/rep-performance
 *
 * Feature: sales rep/user performance — invoices and revenue per staff user.
 */
export interface RepPerformanceRow {
  userId: string;
  userName: string;
  invoiceCount: number;
  totalRevenue: number;
  newCustomers: number;
  periodLabel: string;
}

export async function getRepPerformanceReport(
  _tenantId: string,
  _dateRange: { from: string; to: string },
): Promise<RepPerformanceRow[]> {
  return [];
}
