/**
 * reporting/party-reports
 *
 * Feature: party-level analytics — aging, outstanding, top customers, overdue.
 * Sources: accounting/reports/aging-report.ts, outstanding-receivables.ts, crm
 */
export { getAgingReport } from "../../accounting/reports/aging-report";
export { getOutstandingReceivables } from "../../accounting/reports/outstanding-receivables";
export { listOverdueCustomers } from "../../crm/customer";
export type {
  AgingReport,
  AgingCustomerRow,
  AgingBucket,
} from "../../accounting/reports/types";
export type {
  OutstandingReceivablesReport,
  OutstandingInvoiceRow,
} from "../../accounting/reports/types";
