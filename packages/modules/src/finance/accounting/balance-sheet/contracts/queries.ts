export interface BalanceSheetSection {
  label: string;
  items: { name: string; amount: number }[];
  total: number;
}
export interface BalanceSheetReport {
  asOf: string;
  tenantId: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
}
