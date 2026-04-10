/**
 * finance/accounting/daybook
 *
 * Feature: day-book — all transactions (debit+credit) ledger for a given date.
 * Owner: finance domain
 * Source of truth: accounting/reports/day-book.ts
 */
export * from "./contracts/queries";
export { getDayBook } from "../../../accounting/reports/day-book";
export type { DayBookEntry, DayBookReport, DayBookEntryType } from "../../../accounting/reports/types";
//# sourceMappingURL=index.d.ts.map