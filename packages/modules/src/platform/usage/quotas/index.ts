/**
 * platform/usage/quotas
 *
 * Feature: usage quota enforcement — track and block when plan limits are reached.
 */
export interface QuotaStatus {
  resource: string;
  used: number;
  limit: number;
  percentUsed: number;
  blocked: boolean;
}

export async function getQuotaStatus(
  _tenantId: string,
  _resource: string,
): Promise<QuotaStatus> {
  return {
    resource: _resource,
    used: 0,
    limit: 0,
    percentUsed: 0,
    blocked: false,
  };
}

export async function getAllQuotas(_tenantId: string): Promise<QuotaStatus[]> {
  return [];
}

export async function incrementQuota(
  _tenantId: string,
  _resource: string,
  _amount = 1,
): Promise<void> {}
