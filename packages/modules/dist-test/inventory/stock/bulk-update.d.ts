/**
 * inventory/stock/bulk-update
 *
 * Feature: update stock for multiple products in one operation (e.g., after
 * physical stock count / audit).
 * Stub — batch DB write to be implemented (⏳).
 */
export interface StockBulkUpdateItem {
    productId: string;
    newStock: number;
    reason?: string;
}
export interface StockBulkUpdateInput {
    tenantId: string;
    items: StockBulkUpdateItem[];
    auditedBy?: string;
}
export interface StockBulkUpdateResult {
    updated: number;
    failed: {
        productId: string;
        reason: string;
    }[];
}
export declare function bulkUpdateStock(_input: StockBulkUpdateInput): Promise<StockBulkUpdateResult>;
//# sourceMappingURL=bulk-update.d.ts.map