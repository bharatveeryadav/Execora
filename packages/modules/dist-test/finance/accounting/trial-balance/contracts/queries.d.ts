export interface TrialBalanceLine {
    accountCode: string;
    accountName: string;
    debitBalance: number;
    creditBalance: number;
}
export interface TrialBalanceReport {
    asOf: string;
    tenantId: string;
    lines: TrialBalanceLine[];
    totalDebits: number;
    totalCredits: number;
}
//# sourceMappingURL=queries.d.ts.map