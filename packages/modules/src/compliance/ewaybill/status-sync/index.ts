/** Fetch current status of an e-Way Bill from NIC. Stub (⏳). */
export interface EwbStatusResult {
  ewbNo: string;
  status: "active" | "cancelled";
  validUpto: string;
}
export async function getEwayBillStatus(_ewbNo: string): Promise<EwbStatusResult | null> {
  return null;
}
