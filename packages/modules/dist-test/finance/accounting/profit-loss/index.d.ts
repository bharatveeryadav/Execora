/**
 * finance/accounting/profit-loss
 *
 * Feature: P&L report — revenue vs cost for a date range.
 * Owner: finance domain
 * Source of truth: accounting/gst/gstr1.service.ts (getPnlReport method on gstr1Service)
 *
 * Read path: gstr1Service.getPnlReport, gstr1Service.getItemwisePnlReport
 * Types: PnlReport, PnlMonthEntry, PnlComparisonEntry, ItemwisePnlEntry
 */
export * from "./contracts/queries";
export { gstr1Service, type PnlReport, type PnlMonthEntry, type PnlComparisonEntry, type ItemwisePnlEntry, } from "../../../accounting/gst/gstr1.service";
//# sourceMappingURL=index.d.ts.map