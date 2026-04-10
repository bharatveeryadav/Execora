/**
 * finance/accounting/balance-sheet
 *
 * Feature: balance sheet as of date — assets = liabilities + equity.
 * Stub — requires CoA + reconciliation (⏳).
 */
export * from "./contracts/queries";
export declare function getBalanceSheet(tenantId: string, asOf: string): Promise<import("./contracts/queries").BalanceSheetReport>;
//# sourceMappingURL=index.d.ts.map