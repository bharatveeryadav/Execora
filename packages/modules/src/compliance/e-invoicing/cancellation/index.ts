/**
 * compliance/e-invoicing/cancellation
 *
 * Feature: cancel an IRN within 24-hour window on IRP.
 * Stub — requires IRP credentials (⏳).
 */
export interface CancelIrnCommand {
  irn: string;
  cancelReason: "1" | "2" | "3" | "4"; /** GSTN reason codes */
  cancelRemark?: string;
}
export async function cancelIrn(_cmd: CancelIrnCommand): Promise<boolean> {
  throw new Error("IRN cancellation not yet configured.");
}
