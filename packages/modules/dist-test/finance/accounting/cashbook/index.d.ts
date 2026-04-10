/**
 * finance/accounting/cashbook
 *
 * Feature: Daily cash-in / cash-out summary with running balances.
 * Owner: finance domain
 * Source of truth: accounting/expenses/expense.ts
 * Read path: getCashbook, getPurchaseHistory
 */
export * from "./contracts/queries";
export { getCashbook } from "../../../accounting/expenses/expense";
//# sourceMappingURL=index.d.ts.map