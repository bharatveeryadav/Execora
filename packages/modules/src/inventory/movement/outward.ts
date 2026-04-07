/**
 * inventory/movement/outward
 *
 * Feature: record goods dispatched — stock outward movement.
 * Normally triggered by invoice confirmation; also manual dispatch.
 * Read path: getRecentInvoices, getCustomerInvoices for outward audit trail.
 */
export { cancelInvoice } from "../../sales/invoice";
export interface OutwardEntry {
  date: string;
  productId: string;
  quantity: number;
  invoiceId?: string;
  locationId?: string;
  deliveryChallanNo?: string;
}
