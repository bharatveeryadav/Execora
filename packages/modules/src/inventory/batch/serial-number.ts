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
export async function listSerialNumbers(
  _tenantId: string,
  _productId?: string
): Promise<SerialNumberRecord[]> {
  return [];
}
export async function assignSerialNumber(
  _tenantId: string,
  _productId: string,
  _serialNo: string
): Promise<SerialNumberRecord | null> {
  return null;
}
