/**
 * compliance/gst/audit
 *
 * Feature: GST audit trail — immutable log of all GST-relevant document events.
 */
export interface GstAuditEntry {
  id: string;
  tenantId: string;
  eventType: "invoice-created" | "invoice-cancelled" | "credit-note" | "amended" | "e-invoice-generated";
  documentNo: string;
  gstin?: string;
  taxableAmount: number;
  totalTax: number;
  timestamp: string;
  userId?: string;
  hash?: string;
}

export async function listGstAuditEntries(
  _tenantId: string,
  _period: string
): Promise<GstAuditEntry[]> {
  return [];
}

export async function recordGstEvent(
  _tenantId: string,
  _entry: Omit<GstAuditEntry, "id" | "timestamp">
): Promise<GstAuditEntry> {
  throw new Error("Not implemented");
}
