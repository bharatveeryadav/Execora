/**
 * Finance Domain
 *
 * Covers all money-movement accounting: payment recording, credit/reversal,
 * ledger audit trail, cashbook, and expense management.
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - payments: payment-in, settlement
 *  - accounting: ledger-posting, cashbook
 *  - expenses: expense-entry
 *
 * Dependency rule: foundational — no imports from other domains.
 * Source of truth for implementation lives in accounting/ (compat layer).
 */
export * from "./payments/payment-in";
export * from "./payments/settlement";
export * from "./accounting/ledger-posting";
export * from "./accounting/cashbook";
export * from "./expenses/expense-entry";
export * from "./payments/payment-out";
export * from "./accounting/daybook";
export * from "./accounting/profit-loss";
export * from "./payments/payment-allocation";
export * from "./reconciliation/bank-reconciliation";
export * from "./accounting/journal-posting";
export * from "./accounting/chart-of-accounts";
export * from "./accounting/trial-balance";
export * from "./accounting/balance-sheet";
export * from "./expenses/expense-approval";
export * from "./tax-ledger/gst-ledger";
export * from "./accounting/party-ledger";
export * from "./reconciliation/unmatched-review";
export * from "./tax-ledger/itc-tracking";
//# sourceMappingURL=index.d.ts.map