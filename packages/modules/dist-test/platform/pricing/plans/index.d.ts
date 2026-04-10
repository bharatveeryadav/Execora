/**
 * platform/pricing/plans
 *
 * Feature: subscription plan definitions — Starter, Growth, Pro feature sets and limits.
 */
export interface Plan {
    id: string;
    name: string;
    tier: "starter" | "growth" | "pro" | "enterprise";
    monthlyPrice: number;
    annualPrice: number;
    features: string[];
    limits: Record<string, number>;
}
export declare function listPlans(): Promise<Plan[]>;
export declare function getPlan(_planId: string): Promise<Plan | null>;
//# sourceMappingURL=index.d.ts.map