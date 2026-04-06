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
export * from "../finance/payments/ledger";
export * from "../finance/expenses/expense";
export * from "../modules/ledger/ledger.service";
//# sourceMappingURL=index.d.ts.map