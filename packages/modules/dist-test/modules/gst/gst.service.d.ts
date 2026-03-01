/**
 * GST Calculation Service — Indian GST compliance for Execora
 *
 * Rules implemented:
 *  - Intra-state supply  → CGST = SGST = gstRate / 2   (default for kirana)
 *  - Inter-state supply  → IGST = gstRate
 *  - GST-exempt products → 0 tax regardless of rate
 *  - Supply type is determined by comparing tenant state with customer state.
 *    Falls back to INTRASTATE when either state is unknown (safe for kirana stores
 *    that only sell locally).
 *
 * Common Indian GST slabs: 0%, 5%, 12%, 18%, 28%
 */
export type SupplyType = 'INTRASTATE' | 'INTERSTATE';
export interface GstLineItem {
    productName: string;
    hsnCode: string | null;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    cessRate: number;
    isGstExempt: boolean;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
    total: number;
}
export interface GstInvoiceTotals {
    subtotal: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
    totalTax: number;
    grandTotal: number;
    supplyType: SupplyType;
}
declare class GstService {
    /**
     * Determine supply type.
     * Returns INTRASTATE unless both states are known AND different.
     */
    determineSupplyType(tenantState?: string | null, customerState?: string | null): SupplyType;
    /**
     * Calculate GST for a single line item.
     * All monetary values rounded to 2 decimal places.
     */
    calculateLineItem(item: {
        productName: string;
        hsnCode: string | null;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        cessRate: number;
        isGstExempt: boolean;
    }, supplyType?: SupplyType): GstLineItem;
    /**
     * Calculate GST totals for all line items in an invoice.
     */
    calculateInvoiceTotals(lineItems: GstLineItem[]): GstInvoiceTotals;
    /**
     * Format GST rate as a human-readable string.
     * e.g.  0 → "Exempt",  5 → "5%",  18 → "18%"
     */
    formatRate(rate: number, isExempt: boolean): string;
}
export declare const gstService: GstService;
export declare const GST_SLABS: readonly [0, 5, 12, 18, 28];
export declare const KIRANA_GST_RATES: Record<string, {
    gstRate: number;
    description: string;
}>;
export {};
//# sourceMappingURL=gst.service.d.ts.map