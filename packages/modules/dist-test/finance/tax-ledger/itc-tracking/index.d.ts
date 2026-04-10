/**
 * finance/tax-ledger/itc-tracking
 *
 * Feature: input tax credit (ITC) eligibility tracking — track ITC claimed vs pending.
 */
export interface ItcRecord {
    id: string;
    tenantId: string;
    supplierGstin: string;
    invoiceNo: string;
    taxableAmount: number;
    igst: number;
    cgst: number;
    sgst: number;
    eligible: boolean;
    claimed: boolean;
    period: string;
}
export declare function listItcRecords(_tenantId: string, _period: string): Promise<ItcRecord[]>;
export declare function markItcClaimed(_recordId: string): Promise<void>;
export declare function getItcSummary(_tenantId: string, _period: string): Promise<{
    total: number;
    claimed: number;
    pending: number;
}>;
//# sourceMappingURL=index.d.ts.map