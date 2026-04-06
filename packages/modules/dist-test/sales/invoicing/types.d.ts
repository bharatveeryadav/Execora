import type { InvoiceItemInput } from "@execora/types";
export type CreateInvoiceInput = {
    customerId: string;
    items: InvoiceItemInput[];
    notes?: string;
    options?: {
        discountPercent?: number;
        discountAmount?: number;
        tags?: string[];
        withGst?: boolean;
        supplyType?: "INTRASTATE" | "INTERSTATE";
        buyerGstin?: string;
        placeOfSupply?: string;
        recipientAddress?: string;
        reverseCharge?: boolean;
        initialPayment?: {
            amount: number;
            method: "cash" | "upi" | "card" | "other";
        };
        overrideCreditLimit?: boolean;
        isProforma?: boolean;
    };
};
export type CreateInvoiceResult = {
    invoice: {
        id: string;
        invoiceNo?: string;
        [key: string]: unknown;
    };
    autoCreatedProducts?: string[];
    [key: string]: unknown;
};
//# sourceMappingURL=types.d.ts.map