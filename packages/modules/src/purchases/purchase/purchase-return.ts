/**
 * purchases/purchase/purchase-return
 *
 * Feature: return goods to vendor with debit note.
 * Stub — requires purchase_return table in schema (⏳).
 */
export interface PurchaseReturnItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
}
export interface CreatePurchaseReturnInput {
  tenantId: string;
  vendorId: string;
  originalPurchaseOrderId?: string;
  returnDate: string;
  items: PurchaseReturnItem[];
  notes?: string;
}
export interface PurchaseReturn {
  id: string;
  debitNoteNo: string;
  tenantId: string;
  vendorId: string;
  returnDate: string;
  items: PurchaseReturnItem[];
  totalAmount: number;
  status: "pending" | "accepted" | "completed";
  createdAt: Date;
}
export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput
): Promise<PurchaseReturn> {
  const totalAmount = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  return {
    ...input,
    id: `PR-${Date.now()}`,
    debitNoteNo: `DN-${Date.now()}`,
    totalAmount,
    status: "pending",
    createdAt: new Date(),
  };
}
export async function listPurchaseReturns(
  _tenantId: string,
  _vendorId?: string
): Promise<PurchaseReturn[]> {
  return [];
}
