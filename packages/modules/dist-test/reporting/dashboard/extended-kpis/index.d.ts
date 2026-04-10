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
    topProducts: Array<{
        productId: string;
        name: string;
        revenue: number;
    }>;
    topCustomers: Array<{
        customerId: string;
        name: string;
        revenue: number;
    }>;
}
export declare function getExtendedKpis(_tenantId: string, _dateRange: {
    from: string;
    to: string;
}): Promise<ExtendedKpiData>;
//# sourceMappingURL=index.d.ts.map