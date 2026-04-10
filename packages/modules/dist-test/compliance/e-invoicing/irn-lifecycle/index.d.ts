/**
 * compliance/e-invoicing/irn-lifecycle
 *
 * Feature: check IRN status, fetch details from IRP.
 * Stub — requires IRP credentials (⏳).
 */
export interface IrnStatus {
    irn: string;
    status: "active" | "cancelled";
    cancelDate?: string;
    cancelRemark?: string;
}
export declare function getIrnStatus(_irn: string): Promise<IrnStatus | null>;
//# sourceMappingURL=index.d.ts.map