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
  failed: { productId: string; reason: string }[];
}
export async function bulkUpdateStock(
  _input: StockBulkUpdateInput
): Promise<StockBulkUpdateResult> {
  // TODO: prisma.product.updateMany with individual adjustments + audit log
  return { updated: 0, failed: [] };
}
