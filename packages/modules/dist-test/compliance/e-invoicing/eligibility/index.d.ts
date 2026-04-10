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
export declare function checkEInvoicingEligibility(input: EInvoicingEligibilityInput): EInvoicingEligibilityResult;
//# sourceMappingURL=index.d.ts.map