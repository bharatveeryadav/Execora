"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEInvoicingEligibility = checkEInvoicingEligibility;
const MANDATORY_THRESHOLD_CR = 5;
function checkEInvoicingEligibility(input) {
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
//# sourceMappingURL=index.js.map