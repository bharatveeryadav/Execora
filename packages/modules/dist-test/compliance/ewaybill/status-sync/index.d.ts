/** Fetch current status of an e-Way Bill from NIC. Stub (⏳). */
export interface EwbStatusResult {
    ewbNo: string;
    status: "active" | "cancelled";
    validUpto: string;
}
export declare function getEwayBillStatus(_ewbNo: string): Promise<EwbStatusResult | null>;
//# sourceMappingURL=index.d.ts.map