/**
 * platform/subscription/lifecycle
 *
 * Feature: tenant subscription lifecycle — activate, upgrade, downgrade, cancel.
 * Stub — subscription table required in platform DB (⏳).
 */
export type SubscriptionPlan = "free" | "starter" | "growth" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "suspended";
export interface TenantSubscription {
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}
export async function getTenantSubscription(_tenantId: string): Promise<TenantSubscription | null> {
  return null;
}
export async function activateSubscription(tenantId: string, plan: SubscriptionPlan): Promise<TenantSubscription> {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return { tenantId, plan, status: "active", currentPeriodStart: now, currentPeriodEnd: end, cancelAtPeriodEnd: false };
}
export async function cancelSubscription(_tenantId: string, _atPeriodEnd = true): Promise<boolean> {
  return true;
}
