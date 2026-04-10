/**
 * compliance/e-invoicing/irp-submission
 *
 * Feature: submit signed payload to IRP and receive IRN + QR.
 * Stub — requires NIC API credentials and sandbox setup (⏳).
 */
export interface IrpSubmitResult {
    irn: string;
    ackNo: string;
    ackDt: string;
    signedQRCode: string;
    signedInvoice: string;
}
export declare function submitToIRP(_payload: Record<string, unknown>): Promise<IrpSubmitResult>;
//# sourceMappingURL=index.d.ts.map