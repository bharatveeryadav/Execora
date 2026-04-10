/**
 * sales/invoicing/documents/quotation
 *
 * Feature: quotation creation — draft estimate before raising a sale invoice.
 */
export interface Quotation {
    id: string;
    tenantId: string;
    customerId: string;
    items: Array<{
        productId: string;
        qty: number;
        rate: number;
    }>;
    totalAmount: number;
    validUntil: string;
    status: "draft" | "sent" | "accepted" | "expired" | "converted";
    createdAt: string;
}
export declare function createQuotation(_tenantId: string, _input: Omit<Quotation, "id" | "createdAt" | "status">): Promise<Quotation>;
export declare function getQuotation(_id: string): Promise<Quotation | null>;
export declare function convertToInvoice(_quotationId: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map