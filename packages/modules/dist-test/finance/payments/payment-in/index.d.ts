/**
 * finance/payments/payment-in
 *
 * Feature: record incoming customer payments and apply to unpaid invoices.
 * Owner: finance domain
 * Source of truth: accounting/payment.ts
 * Write path: recordPayment, recordMixedPayment
 * Read path: getCustomerLedger, getLedgerSummary, getRecentTransactions
 */
export * from "./contracts/commands";
export * from "./contracts/dto";
export { recordPayment, recordMixedPayment, getCustomerLedger, getLedgerSummary, getRecentTransactions, } from "../../../accounting/payments/ledger";
//# sourceMappingURL=index.d.ts.map