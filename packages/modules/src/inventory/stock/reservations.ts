/**
 * inventory/stock/reservations
 *
 * Feature: soft-reserve stock for pending orders before confirmation.
 * Stub — reservation ledger not yet in schema (⏳).
 */
export interface StockReservation {
  id: string;
  productId: string;
  tenantId: string;
  quantity: number;
  orderId: string;
  expiresAt: Date;
  status: "active" | "released" | "consumed";
}
export async function reserveStock(
  _tenantId: string,
  _productId: string,
  _quantity: number,
  _orderId: string
): Promise<StockReservation | null> {
  return null;
}
export async function releaseReservation(_reservationId: string): Promise<boolean> {
  return false;
}
