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

// ── Payments & ledger (flat functions + LedgerEntryRecord types) ──────────────
export * from "./payments/ledger";

// ── Expenses & cashbook ───────────────────────────────────────────────────────
export * from "./expenses/expense";

// ── LedgerService — P&L, aging, payment velocity ─────────────────────────────
export * from "./ledger/ledger.service";

// ── Financial Reports ─────────────────────────────────────────────────────────
// Shared report types (AgingReport, PaymentVelocityReport, DayBookReport, …)
export * from "./reports/types";
// Accounts-receivable aging (0–30, 31–60, 61–90, 91+ day buckets)
export * from "./reports/aging-report";
// Payment velocity analysis (avg days-to-pay, collection rate per customer)
export * from "./reports/payment-velocity";
// Day book — chronological daily journal with opening/closing cash balance
export * from "./reports/day-book";
// Customer account statement with running balance
export * from "./reports/account-statement";
// Outstanding receivables — all pending/partial invoices
export * from "./reports/outstanding-receivables";

// ── P&L, GSTR-1 reports, Indian FY helpers ────────────────────────────────────
// getPnlReport, getItemwisePnlReport, gstr1Service, PnlReport, PnlMonthEntry,
// Gstr1Report, Gstr1B2BEntry, getIndianFY, indianFYRange, INDIAN_STATE_CODES
export * from "./gst/gstr1.service";

// ── Credit Notes (accounting adjustment documents) ───────────────────────────
// listCreditNotes, getCreditNoteById, createCreditNote, issueCreditNote,
// cancelCreditNote, deleteCreditNote + CreateCreditNoteInput types
export * from "./credit-notes/credit-note";
