/**
 * finance/accounting/chart-of-accounts
 *
 * Feature: hierarchical chart of accounts (CoA) — list, read, manage account nodes.
 * Stub — full CoA CRUD is planned (⏳).
 */
export * from "./contracts/queries";
/** Default kirana-friendly CoA template */
export declare const DEFAULT_KIRANA_COA: import("./contracts/queries").AccountNode[];
export declare function getChartOfAccounts(_tenantId: string): Promise<import("./contracts/queries").ChartOfAccountsResult>;
//# sourceMappingURL=index.d.ts.map