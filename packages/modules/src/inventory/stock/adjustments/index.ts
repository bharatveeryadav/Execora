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

export async function createStockAdjustment(
  _tenantId: string,
  _input: Omit<StockAdjustment, "adjustedAt">,
): Promise<StockAdjustment> {
  throw new Error("Not implemented");
}

export async function listStockAdjustments(
  _tenantId: string,
  _productId?: string,
): Promise<StockAdjustment[]> {
  return [];
}
