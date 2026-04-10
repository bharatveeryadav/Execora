/** Submit e-Way Bill payload to NIC API and get EWB number. Stub (⏳). */
export interface EwbGenerationResult {
    ewbNo: string;
    ewbDt: string;
    ewbValidTill: string;
}
export declare function generateEwayBill(_payload: Record<string, unknown>): Promise<EwbGenerationResult>;
//# sourceMappingURL=index.d.ts.map