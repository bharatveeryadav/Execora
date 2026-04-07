/**
 * finance/accounting/trial-balance
 *
 * Feature: trial balance as of date — aggregate all ledger balances.
 * Stub — requires full CoA + journal to be complete (⏳).
 */
export * from "./contracts/queries";
export async function getTrialBalance(
  _tenantId: string,
  asOf: string
): Promise<import("./contracts/queries").TrialBalanceReport> {
  return {
    asOf,
    tenantId: _tenantId,
    lines: [],
    totalDebits: 0,
    totalCredits: 0,
  };
}
