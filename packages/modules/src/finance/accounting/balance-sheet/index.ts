/**
 * finance/accounting/balance-sheet
 *
 * Feature: balance sheet as of date — assets = liabilities + equity.
 * Stub — requires CoA + reconciliation (⏳).
 */
export * from "./contracts/queries";
export async function getBalanceSheet(
  tenantId: string,
  asOf: string
): Promise<import("./contracts/queries").BalanceSheetReport> {
  const empty = (label: string): import("./contracts/queries").BalanceSheetSection =>
    ({ label, items: [], total: 0 });
  return {
    asOf,
    tenantId,
    assets: empty("Assets"),
    liabilities: empty("Liabilities"),
    equity: empty("Equity"),
  };
}
