/**
 * inventory/stock/adjustments
 *
 * Feature: manual stock adjustments — loss, damage, opening balance entry.
 */
export interface StockAdjustment {
    productId: string;
    quantity: number;
    reason: "damage" | "loss" | "theft" | "opening-balance" | "audit" | "other";
    note?: string;
    adjustedAt: string;
}
export declare function createStockAdjustment(_tenantId: string, _input: Omit<StockAdjustment, "adjustedAt">): Promise<StockAdjustment>;
export declare function listStockAdjustments(_tenantId: string, _productId?: string): Promise<StockAdjustment[]>;
//# sourceMappingURL=index.d.ts.map