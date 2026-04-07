/**
 * inventory/movement/transfer-ledger
 *
 * Feature: chronological log of all stock movements (both inward and outward).
 * Stub — dedicated stock_movement table planned (⏳).
 */
export type MovementType = "inward" | "outward" | "transfer" | "writeoff" | "adjustment";
export interface StockMovementRecord {
  id: string;
  tenantId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  date: Date;
  referenceId?: string;
  referenceType?: string;
  note?: string;
}
export async function listStockMovements(
  _tenantId: string,
  _productId?: string
): Promise<StockMovementRecord[]> {
  return [];
}
