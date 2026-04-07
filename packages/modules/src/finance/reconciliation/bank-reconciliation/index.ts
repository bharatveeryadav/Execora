/**
 * finance/reconciliation/bank-reconciliation
 *
 * Feature: match bank statement entries with internal ledger transactions.
 * Stub — full matching algorithm is planned (⏳).
 */
export * from "./contracts/commands";
export async function reconcileBankStatement(
  input: import("./contracts/commands").BankReconciliationInput
): Promise<import("./contracts/commands").BankReconciliationResult> {
  // TODO: Implement matching algorithm
  return {
    matches: [],
    unmatchedBankEntries: input.entries,
    unmatchedLedgerCount: 0,
    difference: 0,
  };
}
