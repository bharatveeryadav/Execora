/**
 * reporting/finance-reports/account-statement
 *
 * READ-ONLY. Customer account statement with running balance.
 * Source of truth: accounting/reports/account-statement.ts
 */
export type { AccountStatement, StatementEntry } from "../../../accounting/reports/types";
export { getAccountStatement } from "../../../accounting/reports/account-statement";
