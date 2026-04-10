/**
 * purchases/vendors/vendor-ledger
 *
 * Feature: running balance ledger for a vendor — payable / advance / credit.
 * Bridges to finance/accounting/ledger. Stub (⏳ — vendor-specific ledger view).
 */
export interface VendorLedgerEntry {
    date: string;
    type: "bill" | "payment" | "debit-note" | "adjustment";
    reference: string;
    debit: number;
    credit: number;
    balance: number;
    narration?: string;
}
export interface VendorLedgerResult {
    vendorId: string;
    tenantId: string;
    openingBalance: number;
    entries: VendorLedgerEntry[];
    closingBalance: number;
}
export declare function getVendorLedger(tenantId: string, vendorId: string, _dateRange?: {
    from: string;
    to: string;
}): Promise<VendorLedgerResult>;
//# sourceMappingURL=vendor-ledger.d.ts.map