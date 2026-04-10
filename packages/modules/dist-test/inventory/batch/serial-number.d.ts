/**
 * inventory/batch/serial-number
 *
 * Feature: per-unit serial number tracking (electronics, high-value goods).
 * Stub — serial_number table planned (⏳).
 */
export interface SerialNumberRecord {
    serialNo: string;
    productId: string;
    tenantId: string;
    status: "in-stock" | "sold" | "returned" | "written-off";
    invoiceId?: string;
    receivedDate?: Date;
    soldDate?: Date;
}
export declare function listSerialNumbers(_tenantId: string, _productId?: string): Promise<SerialNumberRecord[]>;
export declare function assignSerialNumber(_tenantId: string, _productId: string, _serialNo: string): Promise<SerialNumberRecord | null>;
//# sourceMappingURL=serial-number.d.ts.map