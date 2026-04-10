/**
 * reporting/party-reports/dso
 *
 * Feature: Days Sales Outstanding (DSO) — average collection days per customer.
 */
export interface DsoRow {
    customerId: string;
    customerName: string;
    totalReceivable: number;
    totalRevenue: number;
    dso: number;
    periodDays: number;
}
export declare function getDsoReport(_tenantId: string, _dateRange: {
    from: string;
    to: string;
}): Promise<DsoRow[]>;
//# sourceMappingURL=index.d.ts.map