/**
 * Accounting Module
 *
 * Covers: ledger queries, payment recording, mixed payments, credit notes
 * reversal, expense / cashbook management, and advanced financial reporting
 * (P&L, aging report, payment velocity).
 *
 * Surfaces:
 *  - Flat async functions  → imported directly for API route handlers
 *  - ledgerService         → singleton class with report-generation methods
 */
export * from "./payments/ledger";
export * from "./expenses/expense";
export * from "./ledger/ledger.service";
export * from "./reports/types";
export * from "./reports/aging-report";
export * from "./reports/payment-velocity";
export * from "./reports/day-book";
export * from "./reports/account-statement";
export * from "./reports/outstanding-receivables";
export * from "./gst/gstr1.service";
export * from "./credit-notes/credit-note";
//# sourceMappingURL=index.d.ts.map