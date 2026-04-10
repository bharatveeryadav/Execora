/** Build NIC e-Way Bill JSON payload from an internal invoice. Stub (⏳). */
export interface EwbPayload {
    supplyType: string;
    subSupplyType: string;
    docType: string;
    docNo: string;
    docDate: string;
    fromGstin: string;
    fromTrdName: string;
    fromAddr1: string;
    fromPincode: number;
    fromStateCode: number;
    toGstin: string;
    toTrdName: string;
    toAddr1: string;
    toPincode: number;
    toStateCode: number;
    vehicleNo?: string;
    transporterDocNo?: string;
    totInvVal: number;
    itemList: {
        productName: string;
        hsnCode: string;
        quantity: number;
        taxableAmount: number;
        sgstRate: number;
        cgstRate: number;
        igstRate: number;
    }[];
}
export declare function buildEwbPayload(_invoiceId: string, _tenantId: string): Promise<EwbPayload | null>;
//# sourceMappingURL=index.d.ts.map