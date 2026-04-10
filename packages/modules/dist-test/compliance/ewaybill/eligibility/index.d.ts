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
export declare function checkEwbEligibility(input: EwbEligibilityInput): EwbEligibilityResult;
//# sourceMappingURL=index.d.ts.map