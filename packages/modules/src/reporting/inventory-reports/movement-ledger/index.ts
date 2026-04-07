/**
 * reporting/inventory-reports/movement-ledger
 *
 * Feature: stock movement audit trail — every inward/outward event with timestamp.
 */
export interface StockMovementEntry {
  id: string;
  productId: string;
  productName: string;
  movementType: "inward" | "outward" | "transfer" | "adjustment";
  quantity: number;
  referenceId?: string;
  referenceType?: "invoice" | "purchase" | "transfer" | "adjustment";
  movedAt: string;
}

export async function getStockMovementLedger(
  _tenantId: string,
  _dateRange: { from: string; to: string },
  _productId?: string,
): Promise<StockMovementEntry[]> {
  return [];
}
