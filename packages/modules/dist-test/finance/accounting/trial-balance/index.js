"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrialBalance = getTrialBalance;
/**
 * finance/accounting/trial-balance
 *
 * Feature: trial balance as of date — aggregate all ledger balances.
 * Stub — requires full CoA + journal to be complete (⏳).
 */
__exportStar(require("./contracts/queries"), exports);
async function getTrialBalance(_tenantId, asOf) {
    return {
        asOf,
        tenantId: _tenantId,
        lines: [],
        totalDebits: 0,
        totalCredits: 0,
    };
}
//# sourceMappingURL=index.js.map