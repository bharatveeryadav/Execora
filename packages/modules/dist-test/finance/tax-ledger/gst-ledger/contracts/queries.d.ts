export interface GstLedgerEntry {
    date: string;
    reference: string;
    type: "invoice" | "payment" | "credit-note";
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    net: number;
}
export interface GstLedgerResult {
    tenantId: string;
    period: {
        from: string;
        to: string;
    };
    entries: GstLedgerEntry[];
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
    netGstPayable: number;
}
//# sourceMappingURL=queries.d.ts.map