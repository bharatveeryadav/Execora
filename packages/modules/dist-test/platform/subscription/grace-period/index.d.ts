/**
 * platform/subscription/grace-period
 *
 * Feature: subscription grace period — 7-day dunning window after payment failure.
 */
export interface GracePeriodState {
    tenantId: string;
    expiresAt: string;
    daysRemaining: number;
    reason: "payment-failed" | "manual-hold";
}
export declare function getGracePeriodState(_tenantId: string): Promise<GracePeriodState | null>;
export declare function startGracePeriod(_tenantId: string, _reason: GracePeriodState["reason"], _durationDays?: number): Promise<GracePeriodState>;
export declare function clearGracePeriod(_tenantId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map