/**
 * inventory/warehouse/transfer-request
 *
 * Feature: initiate stock transfer between two warehouse locations.
 * Stub — requires warehouse_location and stock_transfer tables (⏳).
 */
export interface StockTransferRequest {
  id: string;
  tenantId: string;
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  quantity: number;
  status: "pending" | "in-transit" | "completed" | "cancelled";
  requestedAt: Date;
}
export async function createTransferRequest(
  input: Omit<StockTransferRequest, "id" | "requestedAt">
): Promise<StockTransferRequest> {
  return { ...input, id: `TR-${Date.now()}`, requestedAt: new Date() };
}
