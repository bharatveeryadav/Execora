/**
 * compliance/ewaybill/eligibility
 *
 * Feature: determine if a transaction requires an e-Way Bill.
 * Rules: goods value > ₹50,000 across state (IGST), mandatory for certain intra-state.
 */
export interface EwbEligibilityInput {
  transactionValue: number;
  isInterState: boolean;
  supplyType: "regular" | "sez" | "export";
}
export interface EwbEligibilityResult {
  isRequired: boolean;
  reason: string;
}
export function checkEwbEligibility(input: EwbEligibilityInput): EwbEligibilityResult {
  const THRESHOLD = 50000;
  const isRequired = input.isInterState && input.transactionValue >= THRESHOLD;
  return {
    isRequired,
    reason: isRequired
      ? `Inter-state supply ≥ ₹${THRESHOLD} — e-Way Bill required`
      : "e-Way Bill not required for this transaction",
  };
}
