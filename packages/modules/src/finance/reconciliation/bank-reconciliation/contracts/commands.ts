export interface BankStatement {
  date: string;
  description: string;
  credit?: number;
  debit?: number;
  balance: number;
}
export interface ReconciliationMatch {
  bankEntry: BankStatement;
  ledgerEntryId: string;
  matchedAmount: number;
  status: "matched" | "unmatched" | "partial";
}
export interface BankReconciliationInput {
  tenantId: string;
  accountId: string;
  statementDate: string;
  closingBalance: number;
  entries: BankStatement[];
}
export interface BankReconciliationResult {
  matches: ReconciliationMatch[];
  unmatchedBankEntries: BankStatement[];
  unmatchedLedgerCount: number;
  difference: number;
}
