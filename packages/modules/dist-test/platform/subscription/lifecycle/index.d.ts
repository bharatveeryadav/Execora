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
export declare function getTenantSubscription(_tenantId: string): Promise<TenantSubscription | null>;
export declare function activateSubscription(tenantId: string, plan: SubscriptionPlan): Promise<TenantSubscription>;
export declare function cancelSubscription(_tenantId: string, _atPeriodEnd?: boolean): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map