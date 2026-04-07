/**
 * reporting/dashboard/extended-kpis
 *
 * Feature: extended KPI suite — full set of business KPIs beyond basic dashboard tiles.
 */
export interface ExtendedKpiData {
  tenantId: string;
  periodLabel: string;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalTaxCollected: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  newCustomers: number;
  repeatCustomers: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  topProducts: Array<{ productId: string; name: string; revenue: number }>;
  topCustomers: Array<{ customerId: string; name: string; revenue: number }>;
}

export async function getExtendedKpis(
  _tenantId: string,
  _dateRange: { from: string; to: string },
): Promise<ExtendedKpiData> {
  return {
    tenantId: _tenantId,
    periodLabel: "",
    totalRevenue: 0,
    totalExpenses: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalTaxCollected: 0,
    totalPaymentsReceived: 0,
    totalOutstanding: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    invoiceCount: 0,
    averageInvoiceValue: 0,
    topProducts: [],
    topCustomers: [],
  };
}
