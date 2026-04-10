/**
 * reporting/gst-reports/hsn-summary
 *
 * Feature: HSN summary report — aggregate taxable value and tax by HSN code.
 */
export interface HsnSummaryRow {
    hsnCode: string;
    description?: string;
    unitOfMeasure: string;
    totalQty: number;
    totalTaxableValue: number;
    integratedTax: number;
    centralTax: number;
    stateTax: number;
    cess: number;
}
export declare function getHsnSummaryReport(_tenantId: string, _period: string): Promise<HsnSummaryRow[]>;
//# sourceMappingURL=index.d.ts.map