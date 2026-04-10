/**
 * sales/invoicing/documents/delivery-challan
 *
 * Feature: delivery challan — goods dispatch document without tax (loan/approval/job work).
 */
export interface DeliveryChallan {
    id: string;
    tenantId: string;
    customerId: string;
    items: Array<{
        productId: string;
        qty: number;
    }>;
    purpose: "sale-return" | "job-work" | "approval" | "loan" | "other";
    dispatchedAt?: string;
    status: "draft" | "dispatched" | "returned" | "converted";
    createdAt: string;
}
export declare function createDeliveryChallan(_tenantId: string, _input: Omit<DeliveryChallan, "id" | "createdAt" | "status">): Promise<DeliveryChallan>;
export declare function getDeliveryChallan(_id: string): Promise<DeliveryChallan | null>;
//# sourceMappingURL=index.d.ts.map