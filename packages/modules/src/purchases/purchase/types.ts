import { Decimal } from "@prisma/client/runtime/library";

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  batchNo?: string;
  expiryDate?: string;
}

export interface CreatePurchaseOrderInput {
  supplierId?: string;
  expectedDate?: string;
  notes?: string;
  status?: "draft" | "pending";
  items: PurchaseOrderItemInput[];
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string;
  expectedDate?: string;
  notes?: string;
  status?: "draft" | "pending";
  items?: PurchaseOrderItemInput[];
}

export interface ReceiptLineInput {
  itemId: string;
  receivedQty: number;
  batchNo?: string;
  expiryDate?: string;
}

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface PurchaseOrderRecord {
  id: string;
  poNo: string;
  tenantId: string;
  status: string;
  [key: string]: unknown;
}

export { Decimal };
