export interface RecordPaymentInput {
    customerId: string;
    amount: number;
    paymentMode: "cash" | "upi" | "card" | "other";
    notes?: string;
    reference?: string;
    paymentDate?: string;
}
export interface AddCreditInput {
    customerId: string;
    amount: number;
    description: string;
}
export type LedgerEntryRecord = Record<string, unknown>;
//# sourceMappingURL=types.d.ts.map