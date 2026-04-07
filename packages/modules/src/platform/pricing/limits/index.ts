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

export async function getPlanLimits(_planId: string): Promise<PlanLimits> {
  return {
    maxUsers: 0,
    maxInvoicesPerMonth: 0,
    maxStorageMb: 0,
    maxProducts: 0,
    maxBranches: 0,
  };
}

export async function checkLimitExceeded(
  _tenantId: string,
  _resource: keyof PlanLimits,
): Promise<boolean> {
  return false;
}
