/**
 * inventory/alerts/overstock
 *
 * Feature: detect products with stock significantly above reorder level.
 * Stub — requires maxStock field in product schema (⏳).
 */
export interface OverstockAlert {
  productId: string;
  name: string;
  currentStock: number;
  maxStock: number;
  overstockBy: number;
}
export async function getOverstockAlerts(_tenantId: string): Promise<OverstockAlert[]> {
  return [];
}
