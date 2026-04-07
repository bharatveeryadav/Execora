export interface AccountNode {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentCode?: string;
  balance?: number;
}
export interface ChartOfAccountsResult { accounts: AccountNode[]; }
