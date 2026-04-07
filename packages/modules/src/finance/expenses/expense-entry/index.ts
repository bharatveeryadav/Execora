/**
 * finance/expenses/expense-entry
 *
 * Feature: business expense recording and listing.
 * Owner: finance domain
 * Source of truth: accounting/expenses/expense.ts
 * Write path: createExpense, createPurchase
 * Read path: listExpenses, listPurchases, getExpenseSummary
 */
export * from "./contracts/commands";
export * from "./contracts/dto";
export {
  createExpense,
  createPurchase,
  listExpenses,
  listPurchases,
  getExpenseSummary,
} from "../../../accounting/expenses/expense";
