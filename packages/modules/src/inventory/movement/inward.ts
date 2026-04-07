/**
 * inventory/movement/inward
 *
 * Feature: record goods-received (GRN) — stock inward movement.
 * Bridges to purchase order receipt functionality.
 * Source: purchases/purchase/purchase-order.ts → receivePurchaseOrder
 */
export { receivePurchaseOrder as recordGoodsReceived } from "../../purchases/purchase/purchase-order";
export interface GrnEntry {
  date: string;
  productId: string;
  quantity: number;
  locationId?: string;
  purchaseOrderId?: string;
  batchNo?: string;
  expiryDate?: string;
}
