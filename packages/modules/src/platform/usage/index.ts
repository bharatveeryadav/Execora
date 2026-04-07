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
export async function getUsageSnapshot(
  tenantId: string,
  month?: string
): Promise<UsageSnapshot> {
  const m = month ?? new Date().toISOString().slice(0, 7);
  return { tenantId, month: m, invoicesCreated: 0, apiCallsMade: 0, storageUsedMb: 0, activeUsers: 0 };
}
export async function incrementUsageCounter(
  _tenantId: string,
  _counter: keyof Omit<UsageSnapshot, "tenantId" | "month">,
  _by = 1
): Promise<void> {}
