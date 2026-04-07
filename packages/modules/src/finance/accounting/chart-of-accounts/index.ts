/**
 * finance/accounting/chart-of-accounts
 *
 * Feature: hierarchical chart of accounts (CoA) — list, read, manage account nodes.
 * Stub — full CoA CRUD is planned (⏳).
 */
export * from "./contracts/queries";
/** Default kirana-friendly CoA template */
export const DEFAULT_KIRANA_COA: import("./contracts/queries").AccountNode[] = [
  { code: "1000", name: "Cash in Hand",         type: "asset" },
  { code: "1010", name: "Bank Account",          type: "asset" },
  { code: "1100", name: "Accounts Receivable",   type: "asset" },
  { code: "1500", name: "Inventory",             type: "asset" },
  { code: "2000", name: "Accounts Payable",      type: "liability" },
  { code: "2100", name: "GST Payable",           type: "liability" },
  { code: "3000", name: "Owner Equity",          type: "equity" },
  { code: "4000", name: "Sales Revenue",         type: "revenue" },
  { code: "5000", name: "Cost of Goods Sold",    type: "expense" },
  { code: "5100", name: "Operating Expenses",    type: "expense" },
];
export async function getChartOfAccounts(
  _tenantId: string
): Promise<import("./contracts/queries").ChartOfAccountsResult> {
  return { accounts: DEFAULT_KIRANA_COA };
}
