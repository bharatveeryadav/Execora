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

export async function getGracePeriodState(
  _tenantId: string,
): Promise<GracePeriodState | null> {
  return null;
}

export async function startGracePeriod(
  _tenantId: string,
  _reason: GracePeriodState["reason"],
  _durationDays = 7,
): Promise<GracePeriodState> {
  throw new Error("Not implemented");
}

export async function clearGracePeriod(_tenantId: string): Promise<void> {}
