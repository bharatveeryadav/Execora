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
exports.DEFAULT_KIRANA_COA = void 0;
exports.getChartOfAccounts = getChartOfAccounts;
/**
 * finance/accounting/chart-of-accounts
 *
 * Feature: hierarchical chart of accounts (CoA) — list, read, manage account nodes.
 * Stub — full CoA CRUD is planned (⏳).
 */
__exportStar(require("./contracts/queries"), exports);
/** Default kirana-friendly CoA template */
exports.DEFAULT_KIRANA_COA = [
    { code: "1000", name: "Cash in Hand", type: "asset" },
    { code: "1010", name: "Bank Account", type: "asset" },
    { code: "1100", name: "Accounts Receivable", type: "asset" },
    { code: "1500", name: "Inventory", type: "asset" },
    { code: "2000", name: "Accounts Payable", type: "liability" },
    { code: "2100", name: "GST Payable", type: "liability" },
    { code: "3000", name: "Owner Equity", type: "equity" },
    { code: "4000", name: "Sales Revenue", type: "revenue" },
    { code: "5000", name: "Cost of Goods Sold", type: "expense" },
    { code: "5100", name: "Operating Expenses", type: "expense" },
];
async function getChartOfAccounts(_tenantId) {
    return { accounts: exports.DEFAULT_KIRANA_COA };
}
//# sourceMappingURL=index.js.map