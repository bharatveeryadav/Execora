"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEwbEligibility = checkEwbEligibility;
function checkEwbEligibility(input) {
    const THRESHOLD = 50000;
    const isRequired = input.isInterState && input.transactionValue >= THRESHOLD;
    return {
        isRequired,
        reason: isRequired
            ? `Inter-state supply ≥ ₹${THRESHOLD} — e-Way Bill required`
            : "e-Way Bill not required for this transaction",
    };
}
//# sourceMappingURL=index.js.map