/**
 * inventory/stock/stock-level
 *
 * Feature: read and adjust stock levels for individual products.
 * Source of truth: inventory/product.service.ts + sales/invoice.ts (stock side-effects)
 */
export { updateProductStock, getProductById, listProductsPaginated, } from "./item-catalog";
export { writeOffBatch } from "./batch-tracking";
export interface StockLevelSummary {
    productId: string;
    name: string;
    currentStock: number;
    unit: string;
    lowStockThreshold: number;
    isLowStock: boolean;
}
//# sourceMappingURL=stock-level.d.ts.map