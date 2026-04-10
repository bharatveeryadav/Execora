"use strict";
/**
 * Finance Domain
 *
 * Covers all money-movement accounting: payment recording, credit/reversal,
 * ledger audit trail, cashbook, and expense management.
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - payments: payment-in, settlement
 *  - accounting: ledger-posting, cashbook
 *  - expenses: expense-entry
 *
 * Dependency rule: foundational — no imports from other domains.
 * Source of truth for implementation lives in accounting/ (compat layer).
 */
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
// ── Payments ──────────────────────────────────────────────────────────────────
__exportStar(require("./payments/payment-in"), exports);
__exportStar(require("./payments/settlement"), exports);
// ── Accounting ────────────────────────────────────────────────────────────────
__exportStar(require("./accounting/ledger-posting"), exports);
__exportStar(require("./accounting/cashbook"), exports);
// ── Expenses ──────────────────────────────────────────────────────────────────
__exportStar(require("./expenses/expense-entry"), exports);
__exportStar(require("./payments/payment-out"), exports);
__exportStar(require("./accounting/daybook"), exports);
__exportStar(require("./accounting/profit-loss"), exports);
__exportStar(require("./payments/payment-allocation"), exports);
__exportStar(require("./reconciliation/bank-reconciliation"), exports);
__exportStar(require("./accounting/journal-posting"), exports);
__exportStar(require("./accounting/chart-of-accounts"), exports);
__exportStar(require("./accounting/trial-balance"), exports);
__exportStar(require("./accounting/balance-sheet"), exports);
__exportStar(require("./expenses/expense-approval"), exports);
__exportStar(require("./tax-ledger/gst-ledger"), exports);
__exportStar(require("./accounting/party-ledger"), exports);
__exportStar(require("./reconciliation/unmatched-review"), exports);
__exportStar(require("./tax-ledger/itc-tracking"), exports);
//# sourceMappingURL=index.js.map