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
export * from "../finance/payments/ledger";

// ── Expenses & cashbook ───────────────────────────────────────────────────────
export * from "../finance/expenses/expense";

// ── LedgerService — P&L, aging, payment velocity ─────────────────────────────
export * from "../modules/ledger/ledger.service";
