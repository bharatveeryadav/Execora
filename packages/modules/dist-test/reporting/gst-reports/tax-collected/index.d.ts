/**
 * reporting/gst-reports/tax-collected
 *
 * Feature: output tax collected — total GST collected by tax rate, by period.
 */
export interface TaxCollectedRow {
    taxRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
    periodLabel: string;
}
export declare function getTaxCollectedReport(_tenantId: string, _period: string): Promise<TaxCollectedRow[]>;
//# sourceMappingURL=index.d.ts.map