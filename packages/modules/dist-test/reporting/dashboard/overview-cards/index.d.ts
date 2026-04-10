export interface DashboardOverviewCards {
    periodLabel: string;
    totalRevenue: number;
    totalInvoices: number;
    totalOutstanding: number;
    totalExpenses: number;
    lowStockCount: number;
    topProductCount: number;
}
export declare function getDashboardOverview(_tenantId: string, dateRange: {
    from: string;
    to: string;
}): Promise<DashboardOverviewCards>;
//# sourceMappingURL=index.d.ts.map