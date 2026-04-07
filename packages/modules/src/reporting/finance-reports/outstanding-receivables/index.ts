/**
 * reporting/finance-reports/outstanding-receivables
 *
 * READ-ONLY. All pending/partial invoices with amount due.
 * Source of truth: accounting/reports/outstanding-receivables.ts
 */
export type { OutstandingReceivablesReport } from "../../../accounting/reports/types";
export { getOutstandingReceivables } from "../../../accounting/reports/outstanding-receivables";
