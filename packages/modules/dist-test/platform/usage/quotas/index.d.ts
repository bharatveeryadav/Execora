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
export declare function getQuotaStatus(_tenantId: string, _resource: string): Promise<QuotaStatus>;
export declare function getAllQuotas(_tenantId: string): Promise<QuotaStatus[]>;
export declare function incrementQuota(_tenantId: string, _resource: string, _amount?: number): Promise<void>;
//# sourceMappingURL=index.d.ts.map