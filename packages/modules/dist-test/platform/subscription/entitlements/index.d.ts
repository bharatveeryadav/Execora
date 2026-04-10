/**
 * platform/subscription/entitlements
 *
 * Feature: plan-based entitlements — max users, max invoices/month, storage quota.
 */
export interface PlanEntitlements {
    plan: string;
    maxUsers: number;
    maxInvoicesPerMonth: number;
    maxProductCatalogSize: number;
    storageGb: number;
    voiceAssistant: boolean;
    apiAccess: boolean;
    advancedReports: boolean;
    multiWarehouse: boolean;
    ecommerceSyncPlatforms: number;
}
export declare const PLAN_ENTITLEMENTS: Record<string, PlanEntitlements>;
export declare function getEntitlementsForPlan(plan: string): PlanEntitlements;
//# sourceMappingURL=index.d.ts.map