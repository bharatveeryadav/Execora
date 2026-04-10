/**
 * sales/pos/billing/totals
 *
 * Feature: cart totals computation — subtotal, tax, discount, grand total, rounding.
 */
export interface CartTotals {
    subtotal: number;
    taxableAmount: number;
    taxAmount: number;
    discountAmount: number;
    roundOff: number;
    grandTotal: number;
}
export declare function computeCartTotals(lines: Array<{
    taxableAmount: number;
    taxAmount: number;
    discountAmount: number;
}>): CartTotals;
//# sourceMappingURL=index.d.ts.map