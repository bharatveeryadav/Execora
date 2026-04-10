/**
 * platform/usage
 *
 * Feature: track monthly usage counters — invoices created, API calls, storage used.
 * Stub — backed by a usage_counter table (⏳).
 */
export interface UsageSnapshot {
    tenantId: string;
    month: string; /** "YYYY-MM" */
    invoicesCreated: number;
    apiCallsMade: number;
    storageUsedMb: number;
    activeUsers: number;
}
export declare function getUsageSnapshot(tenantId: string, month?: string): Promise<UsageSnapshot>;
export declare function incrementUsageCounter(_tenantId: string, _counter: keyof Omit<UsageSnapshot, "tenantId" | "month">, _by?: number): Promise<void>;
//# sourceMappingURL=index.d.ts.map