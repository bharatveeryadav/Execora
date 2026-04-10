/**
 * Finance / Payments — payment recording and ledger queries.
 * Re-exports from the canonical flat domain file (finance/payment.ts).
 * Kept for backwards-compatibility with any existing imports.
 */
export { recordPayment, recordMixedPayment, addCredit, reversePayment, getCustomerLedger, getLedgerSummary, getRecentTransactions, } from "../payment";
export type { RecordPaymentInput, AddCreditInput, LedgerEntryRecord, } from "./types";
//# sourceMappingURL=ledger.d.ts.map