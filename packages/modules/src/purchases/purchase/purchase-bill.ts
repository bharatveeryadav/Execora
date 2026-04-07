/**
 * purchases/purchase/purchase-bill
 *
 * Feature: record supplier invoices (purchase bills) received.
 * A "purchase bill" is the inward invoice from a vendor after goods/services.
 * Stub — requires purchase_bill table or extends purchase_order (⏳).
 */
export interface PurchaseBillItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate?: number;
  total: number;
}
export interface CreatePurchaseBillInput {
  tenantId: string;
  vendorId: string;
  billDate: string;
  dueDate?: string;
  billNo: string;
  items: PurchaseBillItem[];
  notes?: string;
}
export interface PurchaseBill {
  id: string;
  tenantId: string;
  vendorId: string;
  billDate: string;
  dueDate?: string;
  billNo: string;
  items: PurchaseBillItem[];
  subtotal: number;
  gstTotal: number;
  total: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  notes?: string;
  createdAt: Date;
}
export async function createPurchaseBill(
  input: CreatePurchaseBillInput
): Promise<PurchaseBill> {
  const subtotal = input.items.reduce((s, i) => s + i.total, 0);
  const gstTotal = input.items.reduce(
    (s, i) => s + (i.total * ((i.gstRate ?? 0) / 100)),
    0
  );
  return {
    ...input,
    id: `PB-${Date.now()}`,
    subtotal,
    gstTotal,
    total: subtotal + gstTotal,
    status: "pending",
    createdAt: new Date(),
  };
}
export async function listPurchaseBills(
  _tenantId: string,
  _vendorId?: string
): Promise<PurchaseBill[]> {
  return [];
}
