/**
 * finance/tax-ledger/gst-ledger
 *
 * Feature: GST ledger — running account of GST collected vs paid.
 * Derives from gstr1Service data (⏳ full ledger implementation pending).
 */
export * from "./contracts/queries";
export { gstr1Service } from "../../../accounting/gst/gstr1.service";
export async function getGstLedger(
  tenantId: string,
  period: { from: string; to: string }
): Promise<import("./contracts/queries").GstLedgerResult> {
  return {
    tenantId,
    period,
    entries: [],
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalCess: 0,
    netGstPayable: 0,
  };
}
