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
export const PLAN_ENTITLEMENTS: Record<string, PlanEntitlements> = {
  free: { plan: "free", maxUsers: 1, maxInvoicesPerMonth: 50, maxProductCatalogSize: 100, storageGb: 1, voiceAssistant: false, apiAccess: false, advancedReports: false, multiWarehouse: false, ecommerceSyncPlatforms: 0 },
  starter: { plan: "starter", maxUsers: 3, maxInvoicesPerMonth: 500, maxProductCatalogSize: 1000, storageGb: 5, voiceAssistant: true, apiAccess: false, advancedReports: false, multiWarehouse: false, ecommerceSyncPlatforms: 0 },
  growth: { plan: "growth", maxUsers: 10, maxInvoicesPerMonth: 5000, maxProductCatalogSize: 10000, storageGb: 20, voiceAssistant: true, apiAccess: true, advancedReports: true, multiWarehouse: true, ecommerceSyncPlatforms: 2 },
  enterprise: { plan: "enterprise", maxUsers: 999, maxInvoicesPerMonth: 999999, maxProductCatalogSize: 999999, storageGb: 200, voiceAssistant: true, apiAccess: true, advancedReports: true, multiWarehouse: true, ecommerceSyncPlatforms: 10 },
};
export function getEntitlementsForPlan(plan: string): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS["free"]!;
}
