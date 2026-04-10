/**
 * platform/pricing/limits
 *
 * Feature: plan limit enforcement — max users, invoices/month, storage quotas.
 */
export interface PlanLimits {
    maxUsers: number;
    maxInvoicesPerMonth: number;
    maxStorageMb: number;
    maxProducts: number;
    maxBranches: number;
}
export declare function getPlanLimits(_planId: string): Promise<PlanLimits>;
export declare function checkLimitExceeded(_tenantId: string, _resource: keyof PlanLimits): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map