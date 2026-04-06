import type { CreatePurchaseOrderInput, UpdatePurchaseOrderInput, ReceiptLineInput, PurchaseOrderRecord } from "./types";
export declare function listPurchaseOrders(tenantId: string, opts?: {
    status?: string;
    supplierId?: string;
    limit?: number;
}): Promise<PurchaseOrderRecord[]>;
export declare function getPurchaseOrderById(tenantId: string, id: string): Promise<PurchaseOrderRecord | null>;
export declare function createPurchaseOrder(tenantId: string, userId: string, input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord>;
export declare function updatePurchaseOrder(tenantId: string, id: string, input: UpdatePurchaseOrderInput): Promise<PurchaseOrderRecord | null>;
export declare function receivePurchaseOrder(tenantId: string, id: string, receipts: ReceiptLineInput[]): Promise<PurchaseOrderRecord | null>;
export declare function cancelPurchaseOrder(tenantId: string, id: string): Promise<PurchaseOrderRecord | null>;
export type { CreatePurchaseOrderInput, UpdatePurchaseOrderInput, ReceiptLineInput, PurchaseOrderRecord, } from "./types";
//# sourceMappingURL=purchase-order.d.ts.map