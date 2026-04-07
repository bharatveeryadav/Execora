/**
 * reporting/sales-reports/returns-rate
 *
 * Feature: returns/cancellation rate analysis — return frequency and value by product.
 */
export interface ReturnsRateRow {
  productId: string;
  productName: string;
  unitsSold: number;
  unitsReturned: number;
  returnRate: number;
  returnRevenueLost: number;
}

export async function getReturnsRateReport(
  _tenantId: string,
  _dateRange: { from: string; to: string },
): Promise<ReturnsRateRow[]> {
  return [];
}
