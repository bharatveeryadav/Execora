/**
 * reporting/finance-reports/day-book
 *
 * READ-ONLY. Chronological daily journal with opening/closing cash balances.
 * Source of truth: accounting/reports/day-book.ts
 */
export type { DayBookReport, DayBookEntry } from "../../../accounting/reports/types";
export { getDayBook } from "../../../accounting/reports/day-book";
