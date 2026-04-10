/**
 * sales/pos/billing/pricing
 *
 * Feature: product pricing resolution at POS — base price, MRP, discounts.
 */
export interface PricingResult {
    productId: string;
    baseRate: number;
    discountPct: number;
    finalRate: number;
    mrp: number;
}
export declare function resolveProductPrice(_tenantId: string, _productId: string, _customerId?: string): Promise<PricingResult>;
//# sourceMappingURL=index.d.ts.map