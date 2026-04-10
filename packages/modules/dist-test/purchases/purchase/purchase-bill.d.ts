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
export declare function createPurchaseBill(input: CreatePurchaseBillInput): Promise<PurchaseBill>;
export declare function listPurchaseBills(_tenantId: string, _vendorId?: string): Promise<PurchaseBill[]>;
//# sourceMappingURL=purchase-bill.d.ts.map