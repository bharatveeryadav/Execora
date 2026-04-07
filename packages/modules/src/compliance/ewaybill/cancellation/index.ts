/** Cancel an e-Way Bill on NIC portal. Stub (⏳). */
export interface CancelEwbCommand {
  ewbNo: string;
  cancelReason: 1 | 2 | 3 | 4;
  cancelRemark?: string;
}
export async function cancelEwayBill(_cmd: CancelEwbCommand): Promise<boolean> {
  throw new Error("e-Way Bill cancellation not yet configured.");
}
