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
export declare function createPurchaseReturn(input: CreatePurchaseReturnInput): Promise<PurchaseReturn>;
export declare function listPurchaseReturns(_tenantId: string, _vendorId?: string): Promise<PurchaseReturn[]>;
//# sourceMappingURL=purchase-return.d.ts.map