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
exports.getBalanceSheet = getBalanceSheet;
/**
 * finance/accounting/balance-sheet
 *
 * Feature: balance sheet as of date — assets = liabilities + equity.
 * Stub — requires CoA + reconciliation (⏳).
 */
__exportStar(require("./contracts/queries"), exports);
async function getBalanceSheet(tenantId, asOf) {
    const empty = (label) => ({ label, items: [], total: 0 });
    return {
        asOf,
        tenantId,
        assets: empty("Assets"),
        liabilities: empty("Liabilities"),
        equity: empty("Equity"),
    };
}
//# sourceMappingURL=index.js.map