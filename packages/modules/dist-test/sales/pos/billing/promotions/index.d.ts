/**
 * sales/pos/billing/promotions
 *
 * Feature: promotional pricing — BOGO, percentage-off, amount-off coupons.
 */
export interface Promotion {
    id: string;
    tenantId: string;
    type: "percentage-off" | "amount-off" | "bogo" | "bundle";
    code?: string;
    discountValue: number;
    minOrderAmount?: number;
    applicableProductIds?: string[];
    validFrom: string;
    validUntil: string;
    active: boolean;
}
export declare function listActivePromotions(_tenantId: string): Promise<Promotion[]>;
export declare function applyPromotion(_tenantId: string, _cartTotal: number, _promoCode: string): Promise<{
    discountAmount: number;
    appliedPromoId: string;
} | null>;
//# sourceMappingURL=index.d.ts.map