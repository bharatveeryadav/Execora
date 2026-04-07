/**
 * compliance/e-invoicing/eligibility
 *
 * Feature: determine if a taxpayer is eligible / mandated for e-invoicing.
 * Source: CBIC turnover thresholds (currently ₹5 Cr+).
 */
export interface EInvoicingEligibilityInput {
  tenantId: string;
  annualTurnoverCr: number;
}
export interface EInvoicingEligibilityResult {
  isEligible: boolean;
  isMandatory: boolean;
  threshold: number; /** in Crores INR */
  reason: string;
}
const MANDATORY_THRESHOLD_CR = 5;
export function checkEInvoicingEligibility(
  input: EInvoicingEligibilityInput
): EInvoicingEligibilityResult {
  const isMandatory = input.annualTurnoverCr >= MANDATORY_THRESHOLD_CR;
  return {
    isEligible: isMandatory,
    isMandatory,
    threshold: MANDATORY_THRESHOLD_CR,
    reason: isMandatory
      ? `Turnover ≥ ₹${MANDATORY_THRESHOLD_CR} Cr — e-invoicing mandatory`
      : `Turnover < ₹${MANDATORY_THRESHOLD_CR} Cr — e-invoicing optional`,
  };
}
