/**
 * platform/usage/dashboard
 *
 * Feature: usage dashboard — show current usage vs quota per resource.
 */
export interface UsageDashboardData {
    tenantId: string;
    planName: string;
    billingPeriod: string;
    resources: Array<{
        name: string;
        displayName: string;
        used: number;
        limit: number;
        unit: string;
    }>;
}
export declare function getUsageDashboard(_tenantId: string): Promise<UsageDashboardData>;
//# sourceMappingURL=index.d.ts.map